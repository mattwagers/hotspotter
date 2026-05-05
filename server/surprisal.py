import hashlib
import json
import math
from pathlib import Path

import torch
from transformers import GPT2LMHeadModel, GPT2TokenizerFast

CACHE_DIR = Path(__file__).parent / ".cache"
CACHE_DIR.mkdir(exist_ok=True)

MAX_TOKENS = 1024
STRIDE = 512

_tokenizer: GPT2TokenizerFast | None = None
_model: GPT2LMHeadModel | None = None


def _load_model() -> tuple[GPT2TokenizerFast, GPT2LMHeadModel]:
    global _tokenizer, _model
    if _tokenizer is None:
        _tokenizer = GPT2TokenizerFast.from_pretrained("gpt2")
        _model = GPT2LMHeadModel.from_pretrained("gpt2")
        _model.eval()
    return _tokenizer, _model


def _cache_key(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def _load_cache(key: str) -> dict | None:
    path = CACHE_DIR / f"{key}.json"
    if path.exists():
        with open(path) as f:
            return json.load(f)
    return None


def _save_cache(key: str, data: dict) -> None:
    path = CACHE_DIR / f"{key}.json"
    with open(path, "w") as f:
        json.dump(data, f)


def compute_surprisals(text: str) -> dict:
    key = _cache_key(text)
    cached = _load_cache(key)
    if cached:
        return cached

    tokenizer, model = _load_model()
    encoding = tokenizer(text, return_tensors="pt", add_special_tokens=False)
    input_ids = encoding["input_ids"][0]
    total_tokens = len(input_ids)

    token_surprisals: list[float | None] = [None] * total_tokens

    if total_tokens <= MAX_TOKENS:
        with torch.no_grad():
            logits = model(input_ids.unsqueeze(0)).logits[0]
        log_probs = torch.nn.functional.log_softmax(logits, dim=-1)
        for i in range(1, total_tokens):
            token_surprisals[i] = (
                -log_probs[i - 1, input_ids[i]].item() / math.log(2)
            )
    else:
        # Sliding window: average surprisal estimates across overlapping windows
        counts = [0] * total_tokens
        sums = [0.0] * total_tokens

        start = 0
        while start < total_tokens:
            end = min(start + MAX_TOKENS, total_tokens)
            chunk = input_ids[start:end].unsqueeze(0)
            with torch.no_grad():
                logits = model(chunk).logits[0]
            log_probs = torch.nn.functional.log_softmax(logits, dim=-1)
            for i in range(1, end - start):
                global_i = start + i
                surp = -log_probs[i - 1, input_ids[global_i]].item() / math.log(2)
                sums[global_i] += surp
                counts[global_i] += 1
            if end == total_tokens:
                break
            start += STRIDE

        for i in range(total_tokens):
            if counts[i] > 0:
                token_surprisals[i] = sums[i] / counts[i]

    # Aggregate GPT-2 subword tokens → words using the " " word-boundary strategy.
    # A token that begins with a space (or is the very first token) starts a new word.
    tokens = [tokenizer.decode([tid]) for tid in input_ids.tolist()]

    words: list[str] = []
    word_surprisals: list[float | None] = []
    current_word = ""
    current_surps: list[float] = []

    for i, (token, surp) in enumerate(zip(tokens, token_surprisals)):
        is_new_word = token.startswith(" ") or i == 0
        if is_new_word and i > 0:
            words.append(current_word.strip())
            word_surprisals.append(
                sum(current_surps) / len(current_surps) if current_surps else None
            )
            current_word = token
            current_surps = [surp] if surp is not None else []
        else:
            current_word += token
            if surp is not None:
                current_surps.append(surp)

    if current_word:
        words.append(current_word.strip())
        word_surprisals.append(
            sum(current_surps) / len(current_surps) if current_surps else None
        )

    result = {"words": words, "surprisals": word_surprisals}
    _save_cache(key, result)
    return result


def compute_surprisals_with_context(context: str, text: str) -> dict:
    """Compute surprisals for text conditioned on context; return only text-word surprisals.

    Concatenates context + text, runs the model on the full string, then strips
    the context words from the result. Whitespace word count matches GPT-2 word
    segmentation reliably for clean prose (contractions, punctuation attached to
    words are each treated as one unit by both methods).
    """
    context = context.strip()
    if not context:
        return compute_surprisals(text)

    combined = context + " " + text.strip()
    result = compute_surprisals(combined)

    n_context_words = len(context.split())
    return {
        "words": result["words"][n_context_words:],
        "surprisals": result["surprisals"][n_context_words:],
    }
