from PIL import Image
from pathlib import Path

root = Path('/home/ubuntu/android-chat-app/assets/images')
for name in ['icon.png', 'splash-icon.png', 'favicon.png', 'android-icon-foreground.png']:
    path = root / name
    image = Image.open(path).convert('RGBA')
    image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
    image.save(path, format='PNG', optimize=True, compress_level=9)
