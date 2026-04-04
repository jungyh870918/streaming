from pydub import AudioSegment

TARGET_TTS_DBFS = -6.0
TARGET_BGM_DBFS = -18.0
DUCK_DB         = -10.0
FADE_IN_MS      = 1500
FADE_OUT_MS     = 2000
LEAD_IN_MS      = 500
LEAD_OUT_MS     = 800
XFADE_MS        = 50

def _norm(audio, target):
    if audio.dBFS == float("-inf"): return audio
    return audio.apply_gain(target - audio.dBFS)

def _loop(bgm, ms):
    if not len(bgm): return AudioSegment.silent(duration=ms)
    while len(bgm) < ms: bgm += bgm
    return bgm[:ms]

def mix_tts_with_bgm(tts_path, bgm_path, output_path, duck=True):
    tts = _norm(AudioSegment.from_file(tts_path), TARGET_TTS_DBFS)
    bgm = _norm(AudioSegment.from_file(bgm_path), TARGET_BGM_DBFS)
    tts_p = AudioSegment.silent(LEAD_IN_MS) + tts + AudioSegment.silent(LEAD_OUT_MS)
    total = len(tts_p)
    bed = _loop(bgm, total).fade_in(FADE_IN_MS).fade_out(FADE_OUT_MS)
    if duck:
        t0, t1 = LEAD_IN_MS, LEAD_IN_MS + len(tts)
        before, during, after = bed[:t0], bed[t0:t1].apply_gain(DUCK_DB), bed[t1:]
        bed = before + during + after
        bed = _loop(bed, total)[:total]
    AudioSegment.overlay(bed, tts_p).export(output_path, format="mp3", bitrate="192k")
