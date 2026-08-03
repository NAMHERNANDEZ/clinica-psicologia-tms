import asyncio
import os
import subprocess
import urllib.request
import json
from pathlib import Path

FFMPEG = r"C:\Users\LENOVO\Desktop\clinica-psicologia-tms\node_modules\ffmpeg-static\ffmpeg.exe"
BASE = Path(r"C:\Users\LENOVO\Desktop\clinica-psicologia-tms\marketing")
OUTPUT = BASE / "output"
VIDEOS = BASE / "assets" / "videos"
AUDIO = BASE / "assets" / "audio"

for d in [OUTPUT, VIDEOS, AUDIO]:
    d.mkdir(parents=True, exist_ok=True)

# Videos de Pixabay (URLs directas que funcionan)
CLIPS = [
    ("depression", "https://cdn.pixabay.com/video/2020/07/30/45787-447142869_large.mp4"),
    ("anxiety", "https://cdn.pixabay.com/video/2021/04/07/70231-536808498_large.mp4"),
    ("brain", "https://cdn.pixabay.com/video/2019/09/10/27369-361602498_large.mp4"),
    ("neurons", "https://cdn.pixabay.com/video/2020/05/25/40237-424930952_large.mp4"),
    ("clinic", "https://cdn.pixabay.com/video/2020/05/25/40106-424726713_large.mp4"),
    ("doctor", "https://cdn.pixabay.com/video/2020/08/09/47288-450086692_large.mp4"),
    ("happy", "https://cdn.pixabay.com/video/2016/11/28/6486-193428427_large.mp4"),
    ("sunrise", "https://cdn.pixabay.com/video/2015/09/09/5180-135489278_large.mp4"),
]

SCENES = [
    ("01-hook", "depression", 5),
    ("02-depresion", "depression", 15),
    ("03-ansiedad", "anxiety", 15),
    ("04-que-es-tms", "brain", 20),
    ("05-como-funciona", "neurons", 15),
    ("06-beneficios-dep", "happy", 15),
    ("07-beneficios-ans", "sunrise", 10),
    ("08-credibilidad", "clinic", 10),
    ("09-cta", "doctor", 15),
]

VOICES = [
    ("01-hook", "La depresion o la ansiedad controlan tu vida?"),
    ("02-depresion", "Millones de personas sufren depresion. Dias sin energia, sin ganas de vivir, sin esperanza. Medicamentos que no funcionan, efectos secundarios que empeoran tu calidad de vida."),
    ("03-ansiedad", "Y la ansiedad que no te deja dormir, que te paraliza, que te hace sentir que algo terrible va a pasar. Ataques de panico, preocupacion constante, miedo sin razon."),
    ("04-que-es-tms", "Pero existe una alternativa. La Terapia Magnetica Transcraneal. Un tratamiento no invasivo que utiliza campos magneticos para estimular areas especificas del cerebro. Sin cirugia, sin anestesia, sin dolor."),
    ("05-como-funciona", "Una bobina se coloca sobre tu cabeza y genera pulsos magneticos que activan neuronas en areas cerebrales responsables de la depresion y la ansiedad. Cada sesion dura treinta a cuarenta y cinco minutos."),
    ("06-beneficios-dep", "Para la depresion. Mejora el animo. Reduce la tristeza. Recupera la energia. Resultados comprobados en pocas sesiones."),
    ("07-beneficios-ans", "Para la ansiedad. Reduce el estres. Controla los ataques de panico. Mejora el sueno. Recupera tu calma y tu vida."),
    ("08-credibilidad", "Aprobado por las principales autoridades sanitarias del mundo. La FDA en Estados Unidos. COFEPRIS en Mexico. La CE en Union Europea. Miles de pacientes ya cambiaron su vida con TMS."),
    ("09-cta", "Depresion o ansiedad? TMS puede ayudarte. Agenda tu consulta hoy. WhatsApp: cinco dos, dos tres uno, uno cuarenta y cuatro, veintinueve, cuarenta y uno."),
]

TEXTS = {
    "01-hook": "La depresion o la ansiedad controlan tu vida?",
    "02-depresion": "Sin energia. Sin ganas de vivir. Sin esperanza.",
    "03-ansiedad": "Ataques de panico. Preocupacion constante. Miedo sin razon.",
    "04-que-es-tms": "TERAPIA MAGNETICA TRANSCRANEAL",
    "05-como-funciona": "Estimula areas cerebrales especificas. 30-45 minutos.",
    "06-beneficios-dep": "Mejora el animo. Reduce la tristeza. Recupera la energia.",
    "07-beneficios-ans": "Reduce el estres. Controla el panico. Mejora el sueno.",
    "08-credibilidad": "FDA. COFEPRIS. CE. Miles de pacientes.",
    "09-cta": "Agenda tu consulta HOY. WhatsApp: 52 231 144 2941",
}

def run(cmd):
    return subprocess.run(cmd, shell=True, capture_output=True)

def download(url, dest):
    if dest.exists() and dest.stat().st_size > 1000:
        return True
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            with open(dest, 'wb') as f:
                f.write(response.read())
        return dest.exists() and dest.stat().st_size > 1000
    except Exception as e:
        return False

async def generate_voice():
    print("[VOICE] Generando voz con Edge TTS...")
    import edge_tts
    
    all_audio = []
    for name, text in VOICES:
        out = AUDIO / f"{name}.mp3"
        communicate = edge_tts.Communicate(text, "es-MX-DaliaNeural", rate="-5%")
        await communicate.save(str(out))
        all_audio.append(str(out))
        print(f"  [OK] {name}")
    
    list_file = AUDIO / "list.txt"
    with open(list_file, "w") as f:
        for a in all_audio:
            f.write(f"file '{a}'\n")
    
    final = AUDIO / "narration.mp3"
    run(f'"{FFMPEG}" -y -f concat -safe 0 -i "{list_file}" -c copy "{final}"')
    print("[OK] Voz completa\n")
    return final

def download_clips():
    print("[DOWNLOAD] Descargando clips de video...\n")
    for name, url in CLIPS:
        dest = VIDEOS / f"{name}.mp4"
        if dest.exists() and dest.stat().st_size > 1000:
            print(f"  [OK] {name} ya existe")
            continue
        print(f"  [DL] {name}...")
        if download(url, dest):
            print(f"  [OK] {name} ({dest.stat().st_size // 1024}KB)")
        else:
            print(f"  [WARN] {name} - creando clip")
            run(f'"{FFMPEG}" -y -f lavfi -i "color=c=0x0d1117:s=1920x1080:d=5" -c:v libx264 -pix_fmt yuv420p "{dest}"')

def create_scenes():
    print("\n[SCENES] Creando escenas...\n")
    
    for name, clip, dur in SCENES:
        src = VIDEOS / f"{clip}.mp4"
        dst = OUTPUT / f"{name}.mp4"
        text = TEXTS[name].replace("'", "'\\''")
        cmd = f'"{FFMPEG}" -y -i "{src}" -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,drawtext=text=\'{text}\':fontsize=48:fontcolor=white:borderw=3:bordercolor=black:x=(w-text_w)/2:y=h-100" -c:v libx264 -t {dur} -pix_fmt yuv420p -r 30 "{dst}"'
        run(cmd)
        print(f"  [OK] {name} ({dur}s)")

def concat_and_audio(audio):
    print("\n[CONCAT] Concatenando...")
    list_file = OUTPUT / "concat.txt"
    with open(list_file, "w") as f:
        for name, _, _ in SCENES:
            f.write(f"file '{name}.mp4'\n")
    
    temp = OUTPUT / "temp.mp4"
    run(f'"{FFMPEG}" -y -f concat -safe 0 -i "{list_file}" -c copy "{temp}"')
    
    print("[AUDIO] Agregando voz...")
    final = OUTPUT / "TMS-PREMIUM-FINAL.mp4"
    run(f'"{FFMPEG}" -y -i "{temp}" -i "{audio}" -c:v copy -c:a aac -b:a 256k -map 0:v:0 -map 1:a:0 "{final}"')
    
    for f in OUTPUT.glob("0*.mp4"):
        f.unlink()
    temp.unlink(missing_ok=True)
    
    return final

async def main():
    print("=" * 55)
    print("  VIDEO PREMIUM TMS - EDGE TTS + VIDEO REAL")
    print("=" * 55 + "\n")
    
    audio = await generate_voice()
    download_clips()
    create_scenes()
    final = concat_and_audio(audio)
    
    size = final.stat().st_size / 1024 / 1024
    
    print("\n" + "=" * 55)
    print("  VIDEO COMPLETADO")
    print("=" * 55)
    print(f"  {final}")
    print(f"  {size:.2f} MB | 120s | 1920x1080")
    print(f"  Voz: Edge TTS es-MX-DaliaNeural")
    print(f"  Video: Clips reales")
    print("=" * 55 + "\n")
    
    os.startfile(str(final))

if __name__ == "__main__":
    asyncio.run(main())