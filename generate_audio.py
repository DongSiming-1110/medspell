"""Regenerate the offline English recordings from bank.json on Windows."""
from array import array
from base64 import b64encode
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
import json
import math
import os
from pathlib import Path
import re
import shutil
import subprocess
from tempfile import TemporaryDirectory
import wave


ROOT = Path(__file__).resolve().parent
VOICE = 'Microsoft Zira Desktop'
SAMPLE_RATE = 22050
SYNTHESIZE = r"""
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
    $synth.SelectVoice($env:MEDSPELL_VOICE)
    $synth.Rate = -1
    $format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(
        22050, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen,
        [System.Speech.AudioFormat.AudioChannel]::Mono)
    $jobs = Get-Content -Raw -Encoding UTF8 -LiteralPath $env:MEDSPELL_VOICE_JOBS | ConvertFrom-Json
    foreach ($job in $jobs) {
        $synth.SetOutputToWaveFile($job.wav, $format)
        $synth.Speak($job.spoken)
        $synth.SetOutputToNull()
    }
} finally {
    $synth.Dispose()
}
"""


def spoken_phrase(phrase):
    phrase = re.sub(r'\ba\(n\) (?=[aeiou])', 'an ', phrase, flags=re.I)
    phrase = phrase.replace('a(n) ', 'a ').replace('DEXA', 'Dexa').replace('PAP', 'Pap')
    return phrase.replace('IRB-approved', 'I R B approved').replace('10-year', 'ten year')


def encode(job, ffmpeg):
    wav_path = Path(job['wav'])
    mp3_path = wav_path.with_suffix('.mp3')
    with wave.open(str(wav_path), 'rb') as source:
        if (source.getnchannels(), source.getsampwidth(), source.getframerate()) != (1, 2, SAMPLE_RATE):
            raise ValueError(f'Unexpected source format: {job["id"]}')
        samples = array('h', source.readframes(source.getnframes()))
    peak = max((abs(s) for s in samples), default=0)
    if peak < 100:
        raise ValueError(f'Empty source: {job["id"]}')
    gain = (32767 * 0.84) / peak
    run = [ffmpeg, '-nostdin', '-hide_banner', '-loglevel', 'error']
    subprocess.run([*run, '-i', str(wav_path), '-af', f'volume={gain:.6f}', '-ar', str(SAMPLE_RATE),
                    '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '48k', str(mp3_path)], check=True)
    result = subprocess.run([*run, '-i', str(mp3_path), '-map', '0:a:0', '-ar', str(SAMPLE_RATE),
                             '-ac', '1', '-f', 's16le', 'pipe:1'], check=True, stdout=subprocess.PIPE)
    decoded = array('h', result.stdout)
    seconds = len(decoded) / SAMPLE_RATE
    level = 20 * math.log10(max(1, math.sqrt(sum(s * s for s in decoded) / max(1, len(decoded)))) / 32768)
    if not (.25 <= seconds <= 15 and -48 < level < -2):
        raise ValueError(f'Invalid recording {job["id"]}: {seconds:.2f}s at {level:.1f} dBFS')
    return job['id'], {'phrase': job['phrase'], 'seconds': round(seconds, 3),
                       'rms_dbfs': round(level, 1), 'sha256': sha256(mp3_path.read_bytes()).hexdigest()}


def main():
    ffmpeg = shutil.which('ffmpeg')
    if not ffmpeg:
        raise RuntimeError('The audio generation tool needs FFmpeg on PATH.')
    bank = json.loads((ROOT / 'bank.json').read_text('utf-8'))
    ids = [q['id'] for q in bank]
    if not bank or len(set(ids)) != len(ids) or not all(re.fullmatch(r'\d+-\d+', key) for key in ids):
        raise ValueError('Question IDs must be unique unit-number pairs.')
    with TemporaryDirectory(prefix='medspell-audio-', dir=ROOT) as work:
        temp = Path(work)
        jobs = []
        for q in bank:
            if q['prompt'].count('_') != 1 or not q['answers'][0].strip():
                raise ValueError(f'Missing phrase for {q["id"]}')
            phrase = q['prompt'].replace('_', q['answers'][0])
            jobs.append({'id': q['id'], 'phrase': phrase, 'spoken': spoken_phrase(phrase),
                         'wav': str(temp / (q['id'] + '.wav'))})
        job_file = temp / 'jobs.json'
        job_file.write_text(json.dumps(jobs, ensure_ascii=False), encoding='utf-8')
        command = b64encode(SYNTHESIZE.encode('utf-16le')).decode('ascii')
        subprocess.run(['powershell.exe', '-NoProfile', '-NonInteractive', '-EncodedCommand', command],
                       env=dict(os.environ, MEDSPELL_VOICE=VOICE, MEDSPELL_VOICE_JOBS=str(job_file)), check=True)
        with ThreadPoolExecutor(max_workers=4) as workers:
            clips = dict(workers.map(lambda job: encode(job, ffmpeg), jobs))
        archive = ROOT / 'docs' / 'audio'
        archive.mkdir(exist_ok=True)
        manifest = temp / 'manifest.json'
        manifest.write_text(json.dumps({'voice': VOICE, 'clips': clips}, ensure_ascii=False, indent=2),
                            encoding='utf-8')
        for key in clips:
            os.replace(temp / (key + '.mp3'), archive / (key + '.mp3'))
        os.replace(manifest, ROOT / 'audio-manifest.json')
        print(f'{len(clips)} complete phrases synthesized and decoded successfully.')


if __name__ == '__main__':
    main()
