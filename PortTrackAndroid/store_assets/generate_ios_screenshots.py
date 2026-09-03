import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# Hedef Apple 6.5" Display Boyutu
CANVAS_W = 1284
CANVAS_H = 2778

# Dosyalar ve Başlıklar
SCREENS = [
    {
        "file": "media_1788420962848.jpg",
        "tag": "PORTFÖY YÖNETİMİ",
        "title": "Tüm Varlıklarınız\nTek Ekranda",
        "subtitle": "BIST, TEFAS, Kripto ve Altın yatırımlarınızı canlı izleyin",
        "output": "01_portfoy_genel_bakis.png"
    },
    {
        "file": "media_1788420962814.jpg",
        "tag": "TEFAS FON ANALİZİ",
        "title": "Akıllı TEFAS ve\nFon Analizi",
        "subtitle": "Yatırımcı akışları, talep dengesi ve 4 haftalık trendler",
        "output": "02_tefas_fon_analiz.png"
    },
    {
        "file": "media_1788420962929.jpg",
        "tag": "KÂR / ZARAR YÖNETİMİ",
        "title": "Net Kâr, Zarar ve\nOrtalama Maliyet",
        "subtitle": "Gerçekleşmiş kâr ve anlık getiri oranlarınızı şeffafça görün",
        "output": "03_fon_detay_pozisyon.png"
    },
    {
        "file": "media_1788420962951.jpg",
        "tag": "GEÇMİŞ VE PERFORMANS",
        "title": "Detaylı Trendler ve\nAylık Getiriler",
        "subtitle": "Son 1 yıllık aylık performans ve haftalık yatırımcı grafikleri",
        "output": "04_fon_trend_performans.png"
    },
    {
        "file": "media_1788420962973.jpg",
        "tag": "HIZLI VE GÜVENLİ",
        "title": "Yatırımlarınızı\nBugün Keşfedin",
        "subtitle": "Google, Apple veya E-posta ile saniyeler içinde başlayın",
        "output": "05_giris_ve_guvenlik.png"
    }
]

BASE_INPUT = r"C:\Users\onurc\.gemini\antigravity-ide\brain\180a8342-2fe3-4119-a984-480f4140aef1\.user_uploaded"
OUTPUT_DIR = r"c:\Users\onurc\OneDrive\Desktop\Cursor\PortTrack\PortTrackAndroid\store_assets\ios_screenshots"

os.makedirs(OUTPUT_DIR, exist_ok=True)

# Fontları Yükle
FONT_PATH_BOLD = r"C:\Windows\Fonts\segoeuib.ttf"
FONT_PATH_REG = r"C:\Windows\Fonts\segoeui.ttf"

font_tag = ImageFont.truetype(FONT_PATH_BOLD, 36)
font_title = ImageFont.truetype(FONT_PATH_BOLD, 76)
font_subtitle = ImageFont.truetype(FONT_PATH_REG, 40)

def create_gradient(w, h, top_color, bottom_color):
    """Dikey yumuşak gradient arka plan üretir"""
    base = Image.new("RGB", (w, h), top_color)
    top_r, top_g, top_b = top_color
    bot_r, bot_g, bot_b = bottom_color
    
    # 1px genişliğinde sütun üretip genişlet
    grad = Image.new("RGB", (1, h))
    for y in range(h):
        ratio = y / float(h)
        r = int(top_r + (bot_r - top_r) * ratio)
        g = int(top_g + (bot_g - top_g) * ratio)
        b = int(top_b + (bot_b - top_b) * ratio)
        grad.putpixel((0, y), (r, g, b))
    
    return grad.resize((w, h))

def add_rounded_corners(im, rad):
    """Köşeleri yuvarlatır ve pürüzsüz maske uygular"""
    circle = Image.new('L', (rad * 4, rad * 4), 0)
    draw = ImageDraw.Draw(circle)
    draw.ellipse((0, 0, rad * 4 - 1, rad * 4 - 1), fill=255)
    circle = circle.resize((rad * 2, rad * 2), Image.Resampling.LANCZOS)
    
    alpha = Image.new('L', im.size, 255)
    w, h = im.size
    alpha.paste(circle.crop((0, 0, rad, rad)), (0, 0))
    alpha.paste(circle.crop((rad, 0, rad * 2, rad)), (w - rad, 0))
    alpha.paste(circle.crop((0, rad, rad, rad * 2)), (0, h - rad))
    alpha.paste(circle.crop((rad, rad, rad * 2, rad * 2)), (w - rad, h - rad))
    
    im.putalpha(alpha)
    return im

print("Görseller üretiliyor...")

for idx, item in enumerate(SCREENS):
    img_path = os.path.join(BASE_INPUT, item["file"])
    if not os.path.exists(img_path):
        print(f"Hata: {img_path} bulunamadı!")
        continue
    
    raw_img = Image.open(img_path).convert("RGBA")
    
    # 1. Tuval Arka Planı (Lüks Koyu Gece Mavisi / İndigo Gradient)
    canvas = create_gradient(CANVAS_W, CANVAS_H, (10, 15, 29), (18, 26, 47)).convert("RGBA")
    draw = ImageDraw.Draw(canvas)
    
    # Dekoratif Üst Işıltı (Glow efekti)
    glow = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse([CANVAS_W // 2 - 500, 200, CANVAS_W // 2 + 500, 1000], fill=(99, 102, 241, 35))
    glow = glow.filter(ImageFilter.GaussianBlur(120))
    canvas = Image.alpha_composite(canvas, glow)
    draw = ImageDraw.Draw(canvas)
    
    # 2. Üst Metinler
    # A) Kapsül Etiket (Tag Badge)
    tag_text = item["tag"]
    tag_bbox = font_tag.getbbox(tag_text)
    tag_w = tag_bbox[2] - tag_bbox[0]
    tag_h = tag_bbox[3] - tag_bbox[1]
    
    tag_x = (CANVAS_W - tag_w) // 2
    tag_y = 150
    badge_pad_x = 36
    badge_pad_y = 16
    
    # Rozet arka planı
    badge_box = [
        tag_x - badge_pad_x,
        tag_y - badge_pad_y,
        tag_x + tag_w + badge_pad_x,
        tag_y + tag_h + badge_pad_y + 4
    ]
    draw.rounded_rectangle(badge_box, radius=24, fill=(30, 41, 69, 220), outline=(99, 102, 241, 160), width=2)
    draw.text((tag_x, tag_y), tag_text, font=font_tag, fill=(165, 180, 252))
    
    # B) Ana Başlık (Title)
    title_text = item["title"]
    title_lines = title_text.split("\n")
    cur_y = 260
    for line in title_lines:
        line_bbox = font_title.getbbox(line)
        line_w = line_bbox[2] - line_bbox[0]
        line_x = (CANVAS_W - line_w) // 2
        draw.text((line_x, cur_y), line, font=font_title, fill=(255, 255, 255))
        cur_y += 94
        
    # C) Alt Başlık (Subtitle)
    sub_text = item["subtitle"]
    sub_bbox = font_subtitle.getbbox(sub_text)
    sub_w = sub_bbox[2] - sub_bbox[0]
    sub_x = (CANVAS_W - sub_w) // 2
    draw.text((sub_x, cur_y + 16), sub_text, font=font_subtitle, fill=(148, 163, 184))
    
    # 3. Telefon Ekranı / Çerçevesi
    # Ekran boyutlandırma: Genişlik 1020px
    phone_w = 1040
    scale = phone_w / float(raw_img.width)
    phone_h = int(raw_img.height * scale)
    
    scaled_screen = raw_img.resize((phone_w, phone_h), Image.Resampling.LANCZOS)
    
    # Telefonun dış çerçevesi (Köşeleri yuvarlak modern cihaz)
    corner_radius = 58
    framed_screen = add_rounded_corners(scaled_screen, corner_radius)
    
    phone_x = (CANVAS_W - phone_w) // 2
    phone_y = 650
    
    # Gölgelendirme (Drop Shadow)
    shadow = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle(
        [phone_x - 4, phone_y + 16, phone_x + phone_w + 4, phone_y + phone_h + 20],
        radius=corner_radius + 4,
        fill=(0, 0, 0, 160)
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(32))
    canvas = Image.alpha_composite(canvas, shadow)
    
    # Ekranın şık dış çerçevesi (border)
    border_img = Image.new("RGBA", (phone_w + 16, phone_h + 16), (0, 0, 0, 0))
    b_draw = ImageDraw.Draw(border_img)
    b_draw.rounded_rectangle(
        [0, 0, phone_w + 15, phone_h + 15],
        radius=corner_radius + 6,
        fill=(25, 33, 50, 255),
        outline=(70, 85, 120, 200),
        width=4
    )
    canvas.paste(border_img, (phone_x - 8, phone_y - 8), border_img)
    
    # Ekranı yapıştır
    canvas.paste(framed_screen, (phone_x, phone_y), framed_screen)
    
    # 4. Kaydet
    out_file = os.path.join(OUTPUT_DIR, item["output"])
    # Apple RGB (No alpha in final output)
    final_rgb = canvas.convert("RGB")
    final_rgb.save(out_file, format="PNG", optimize=True)
    print(f"OK: Uretildi ({final_rgb.size[0]}x{final_rgb.size[1]}): {item['output']}")

print("\nTum 5 adet App Store vitrin gorseli basariyla tamamlandi!")
