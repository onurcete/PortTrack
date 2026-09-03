import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

IPAD_W = 2048
IPAD_H = 2732

SCREENS = [
    {
        "file": "media_1788420962848.jpg",
        "tag": "PORTFÖY YÖNETİMİ",
        "title": "Tüm Varlıklarınız\nTek Ekranda",
        "subtitle": "BIST, TEFAS, Kripto ve Altın yatırımlarınızı canlı izleyin",
        "output": "ipad_01_portfoy_genel_bakis.png"
    },
    {
        "file": "media_1788420962814.jpg",
        "tag": "TEFAS FON ANALİZİ",
        "title": "Akıllı TEFAS ve\nFon Analizi",
        "subtitle": "Yatırımcı akışları, talep dengesi ve 4 haftalık trendler",
        "output": "ipad_02_tefas_fon_analiz.png"
    },
    {
        "file": "media_1788420962929.jpg",
        "tag": "KÂR / ZARAR YÖNETİMİ",
        "title": "Net Kâr, Zarar ve\nOrtalama Maliyet",
        "subtitle": "Gerçekleşmiş kâr ve anlık getiri oranlarınızı şeffafça görün",
        "output": "ipad_03_fon_detay_pozisyon.png"
    },
    {
        "file": "media_1788420962951.jpg",
        "tag": "GEÇMİŞ VE PERFORMANS",
        "title": "Detaylı Trendler ve\nAylık Getiriler",
        "subtitle": "Son 1 yıllık aylık performans ve haftalık yatırımcı grafikleri",
        "output": "ipad_04_fon_trend_performans.png"
    }
]

BASE_INPUT = r"C:\Users\onurc\.gemini\antigravity-ide\brain\180a8342-2fe3-4119-a984-480f4140aef1\.user_uploaded"
OUTPUT_DIR = r"c:\Users\onurc\OneDrive\Desktop\Cursor\PortTrack\PortTrackAndroid\store_assets\ipad_screenshots"
os.makedirs(OUTPUT_DIR, exist_ok=True)

font_tag = ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf", 46)
font_title = ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf", 98)
font_subtitle = ImageFont.truetype(r"C:\Windows\Fonts\segoeui.ttf", 48)

def create_gradient(w, h, top_color, bottom_color):
    grad = Image.new("RGB", (1, h))
    for y in range(h):
        ratio = y / float(h)
        r = int(top_color[0] + (bottom_color[0] - top_color[0]) * ratio)
        g = int(top_color[1] + (bottom_color[1] - top_color[1]) * ratio)
        b = int(top_color[2] + (bottom_color[2] - top_color[2]) * ratio)
        grad.putpixel((0, y), (r, g, b))
    return grad.resize((w, h))

def add_rounded_corners(im, rad):
    circle = Image.new("L", (rad * 4, rad * 4), 0)
    draw = ImageDraw.Draw(circle)
    draw.ellipse((0, 0, rad * 4 - 1, rad * 4 - 1), fill=255)
    circle = circle.resize((rad * 2, rad * 2), Image.Resampling.LANCZOS)
    alpha = Image.new("L", im.size, 255)
    w, h = im.size
    alpha.paste(circle.crop((0, 0, rad, rad)), (0, 0))
    alpha.paste(circle.crop((rad, 0, rad * 2, rad)), (w - rad, 0))
    alpha.paste(circle.crop((0, rad, rad, rad * 2)), (0, h - rad))
    alpha.paste(circle.crop((rad, rad, rad * 2, rad * 2)), (w - rad, h - rad))
    im.putalpha(alpha)
    return im

print("iPad gorselleri uretiliyor...")

for item in SCREENS:
    img_path = os.path.join(BASE_INPUT, item["file"])
    raw_img = Image.open(img_path).convert("RGBA")
    canvas = create_gradient(IPAD_W, IPAD_H, (246, 248, 253), (232, 238, 249)).convert("RGBA")
    
    glow = Image.new("RGBA", (IPAD_W, IPAD_H), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse([IPAD_W // 2 - 700, 100, IPAD_W // 2 + 700, 1100], fill=(129, 140, 248, 28))
    glow = glow.filter(ImageFilter.GaussianBlur(160))
    canvas = Image.alpha_composite(canvas, glow)
    draw = ImageDraw.Draw(canvas)
    
    # Tag
    tag_bbox = font_tag.getbbox(item["tag"])
    tag_w = tag_bbox[2] - tag_bbox[0]
    tag_h = tag_bbox[3] - tag_bbox[1]
    tag_x = (IPAD_W - tag_w) // 2
    tag_y = 160
    draw.rounded_rectangle([tag_x - 44, tag_y - 20, tag_x + tag_w + 44, tag_y + tag_h + 24], radius=30, fill=(238, 242, 255, 240), outline=(199, 210, 254, 255), width=3)
    draw.text((tag_x, tag_y), item["tag"], font=font_tag, fill=(67, 56, 202))
    
    # Title
    cur_y = 290
    for line in item["title"].split("\n"):
        lb = font_title.getbbox(line)
        lw = lb[2] - lb[0]
        draw.text(((IPAD_W - lw) // 2, cur_y), line, font=font_title, fill=(15, 23, 42))
        cur_y += 116
        
    # Subtitle
    sb = font_subtitle.getbbox(item["subtitle"])
    draw.text(((IPAD_W - (sb[2] - sb[0])) // 2, cur_y + 18), item["subtitle"], font=font_subtitle, fill=(71, 85, 105))
    
    # Phone / Screen
    phone_w = 1220
    scale = phone_w / float(raw_img.width)
    phone_h = int(raw_img.height * scale)
    scaled_screen = raw_img.resize((phone_w, phone_h), Image.Resampling.LANCZOS)
    framed_screen = add_rounded_corners(scaled_screen, 68)
    phone_x = (IPAD_W - phone_w) // 2
    phone_y = 740
    
    # Shadow
    shadow = Image.new("RGBA", (IPAD_W, IPAD_H), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow)
    s_draw.rounded_rectangle([phone_x - 6, phone_y + 20, phone_x + phone_w + 6, phone_y + phone_h + 30], radius=72, fill=(15, 23, 42, 45))
    shadow = shadow.filter(ImageFilter.GaussianBlur(42))
    canvas = Image.alpha_composite(canvas, shadow)
    
    # Border
    border_img = Image.new("RGBA", (phone_w + 20, phone_h + 20), (0, 0, 0, 0))
    b_draw = ImageDraw.Draw(border_img)
    b_draw.rounded_rectangle([0, 0, phone_w + 19, phone_h + 19], radius=74, fill=(255, 255, 255, 255), outline=(218, 225, 238, 255), width=5)
    canvas.paste(border_img, (phone_x - 10, phone_y - 10), border_img)
    canvas.paste(framed_screen, (phone_x, phone_y), framed_screen)
    
    out_file = os.path.join(OUTPUT_DIR, item["output"])
    canvas.convert("RGB").save(out_file, format="PNG", optimize=True)
    print(f"OK: {item['output']} (2048x2732)")

print("iPad gorselleri tamamlandi!")
