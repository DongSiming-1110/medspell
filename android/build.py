"""Build the offline Android app with only Python, a JDK, and Android SDK tools."""
import argparse
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
from xml.etree import ElementTree
from zipfile import ZIP_DEFLATED, ZipFile


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / 'app' / 'src' / 'main'
ANDROID = '{http://schemas.android.com/apk/res/android}'


def run(*command):
    subprocess.run([str(part) for part in command], check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sdk', default=os.environ.get('ANDROID_HOME') or os.environ.get('ANDROID_SDK_ROOT'))
    parser.add_argument('--keystore', type=Path, help='PKCS12/JKS file; omit to produce an unsigned build.')
    parser.add_argument('--alias', default='medspell')
    parser.add_argument('--pass-env', default='MEDSPELL_ANDROID_STOREPASS',
                        help='Name of the environment variable containing the signing password.')
    parser.add_argument('--work-dir', type=Path, help='Build scratch directory, e.g. a short ASCII path on Windows.')
    args = parser.parse_args()
    if not args.sdk:
        parser.error('Pass --sdk or set ANDROID_HOME to your Android SDK directory.')
    sdk = Path(args.sdk).resolve()
    tools = sdk / 'build-tools' / '36.0.0'
    android = sdk / 'platforms' / 'android-36' / 'android.jar'
    suffix = '.exe' if os.name == 'nt' else ''
    javac, java = shutil.which('javac'), shutil.which('java')
    if not (javac and java and android.is_file() and tools.is_dir()):
        parser.error('Install JDK 17, Android platform 36, and build-tools 36.0.0.')
    if args.keystore and not (args.keystore.is_file() and os.environ.get(args.pass_env)):
        parser.error('The signing key or its password environment variable is missing.')
    if not (SOURCE / 'assets' / 'index.html').is_file():
        parser.error('Place the rendered offline page in app/src/main/assets/index.html first.')
    stage = args.work_dir or ROOT / 'build'
    if args.work_dir is None and os.name == 'nt' and not str(stage).isascii():
        stage = Path(tempfile.gettempdir())
    stage = stage.resolve()
    stage.mkdir(parents=True, exist_ok=True)
    release = ROOT / 'release'
    release.mkdir(exist_ok=True)
    manifest = SOURCE / 'AndroidManifest.xml'
    version = ElementTree.parse(manifest).getroot().get(ANDROID + 'versionName')
    output = release / f'MedSpell-{version}-android-{"release" if args.keystore else "unsigned"}.apk'
    with tempfile.TemporaryDirectory(prefix='android-', dir=stage) as temp:
        work = Path(temp)
        source = work / 'source'
        shutil.copytree(SOURCE, source)
        classes, dex = work / 'classes', work / 'dex'
        classes.mkdir()
        dex.mkdir()
        resources = work / 'resources.zip'
        raw, aligned, signed = [work / (name + '.apk') for name in ('raw', 'aligned', 'signed')]
        aapt = tools / ('aapt2' + suffix)
        run(aapt, 'compile', '--dir', source / 'res', '-o', resources)
        run(aapt, 'link', '-I', android, '--manifest', source / manifest.name, '-A', source / 'assets',
            '-o', raw, resources)
        run(javac, '-encoding', 'UTF-8', '-source', '8', '-target', '8', '-bootclasspath', android,
            '-d', classes, *sorted((source / 'java').rglob('*.java')))
        run(java, '-cp', tools / 'lib' / 'd8.jar', 'com.android.tools.r8.D8', '--min-api',
            '26', '--lib', android, '--output', dex, *sorted(classes.rglob('*.class')))
        with ZipFile(raw, 'a', compression=ZIP_DEFLATED) as apk:
            apk.write(dex / 'classes.dex', 'classes.dex')
        align = tools / ('zipalign' + suffix)
        run(align, '-f', '4', raw, aligned)
        if args.keystore:
            signer = [java, '-jar', tools / 'lib' / 'apksigner.jar']
            run(*signer, 'sign', '--ks', args.keystore.resolve(), '--ks-key-alias', args.alias,
                '--ks-pass', 'env:' + args.pass_env, '--key-pass', 'env:' + args.pass_env,
                '--v4-signing-enabled', 'false', '--out', signed, aligned)
            run(*signer, 'verify', '--verbose', '--print-certs', signed)
        package = signed if args.keystore else aligned
        run(align, '-c', '4', package)
        with ZipFile(package) as apk:
            if apk.testzip() or apk.read('assets/index.html') != (SOURCE / 'assets/index.html').read_bytes():
                raise ValueError('Packaged practice page differs from the input.')
        pending = output.with_suffix('.apk.part')
        shutil.copyfile(package, pending)
        os.replace(pending, output)
    print(output)


if __name__ == '__main__':
    main()
