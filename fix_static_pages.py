#!/usr/bin/env python3
"""
Apply the redesign to hand-maintained pages (blog posts, about, contact,
privacy, map, blog index):

  - swap the Oswald webfont for Inter (matches the new stylesheet)
  - promote the page heading to <h1> (hero + blog post headers)
  - promote blog post section headings h3 -> h2 for a proper outline
  - remove the deprecated enable_page_level_ads snippet and all empty
    placeholder ad units (the AdSense loader stays in <head> for review)
  - replace the old two-line footer with the sitewide footer
"""
import re
from pathlib import Path

import build

ROOT = Path(__file__).parent / "propane-directory"

FONT_OLD = "https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&display=swap"
FONT_NEW = "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap"


def make_footer(prefix=""):
    _, by_city, _, _ = build.load_data()
    footer = build.footer_html(by_city)
    if prefix:
        footer = re.sub(r'href="(?!https?:|#|\.\./)', f'href="{prefix}', footer)
    return footer


def fix_page(path, footer):
    html = path.read_text()
    orig = html

    # Font swap
    html = html.replace(FONT_OLD, FONT_NEW)

    # Header brand: logo image + wordmark
    prefix = "../" if path.parent.name == "blog" else ""
    html = re.sub(
        r'<a href="(\.\./)?index\.html"><img src="(\.\./)?images/logo\.png" alt="FindMyPropane\.com" class="site-logo"></a>',
        f'<a href="{prefix}index.html" class="brand" aria-label="FindMyPropane.com home">'
        f'<img src="{prefix}images/logo.png" alt="" class="site-logo" width="44" height="44">'
        '<span class="brand-name">FindMy<span>Propane</span></span></a>',
        html)

    # Remove legacy page-level ads push (deprecated; auto ads are configured
    # in the AdSense dashboard instead)
    html = re.sub(
        r"\s*<script>\s*\(adsbygoogle = window\.adsbygoogle \|\| \[\]\)\.push\(\{\s*"
        r"google_ad_client:[^}]*enable_page_level_ads: true\s*\}\);\s*</script>",
        "", html)

    # Remove empty placeholder ad sections and stray init pushes
    html = re.sub(r'\s*<section class="ads-(?:top|bottom)">.*?</section>', "", html, flags=re.S)
    html = re.sub(r'\s*<div class="ad-inline">.*?</div>', "", html, flags=re.S)
    html = re.sub(
        r"\s*<script>\s*\(adsbygoogle = window\.adsbygoogle \|\| \[\]\)\.push\(\{\}\);\s*</script>",
        "", html)

    # Heading promotion: hero h2 -> h1, blog post header h2 -> h1
    html = re.sub(
        r'(<section class="hero"[^>]*>\s*)<h2>(.*?)</h2>',
        r"\1<h1>\2</h1>", html, flags=re.S)
    html = re.sub(
        r'(<header class="post-header">\s*)<h2>(.*?)</h2>',
        r"\1<h1>\2</h1>", html, flags=re.S)

    # Blog posts: section headings h3 -> h2 (h4 stays as-is)
    if path.parent.name == "blog":
        article = re.search(r'<article class="blog-post">.*?</article>', html, re.S)
        if article:
            fixed = article.group(0).replace("<h3>", "<h2>").replace("</h3>", "</h2>")
            html = html.replace(article.group(0), fixed)

    # Footer replacement
    html = re.sub(
        r'    <footer>\s*<div class="container">\s*<p>&copy;.*?</footer>\n',
        footer, html, flags=re.S)

    if html != orig:
        path.write_text(html)
        return True
    return False


def main():
    root_footer = make_footer()
    blog_footer = make_footer("../")
    for name in ["about.html", "contact.html", "privacy.html", "map.html", "blog.html"]:
        changed = fix_page(ROOT / name, root_footer)
        print(f"{'fixed ' if changed else 'skip  '}{name}")
    for path in sorted((ROOT / "blog").glob("*.html")):
        changed = fix_page(path, blog_footer)
        print(f"{'fixed ' if changed else 'skip  '}blog/{path.name}")


if __name__ == "__main__":
    main()
