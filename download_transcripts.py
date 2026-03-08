#!/usr/bin/env python3
"""Download YouTube transcripts for Nate B Jones channel videos."""

import os
import re
import ssl
import json
import urllib.request

VIDEOS = [
    ("-_vL1KXd2rc", "GPT-5.4 Let Mickey Mouse Into a Production Database. Nobody Noticed. (What This Means For Your Work)"),
    ("09sFAO7pklo", "Claude Code vs Codex: The Decision That Compounds Every Week You Delay That Nobody Is Talking About"),
    ("JYcidOS9ozU", "OpenAI Leaked GPT-5.4. It's a Distraction. (The AI Lock-In No One Is Talking About)"),
    ("O7SSQfiPDXA", "Everyone You Know Is About to Try Claude (I Showed 3 People for 5 Minutes — All 3 Switched)"),
    ("pTtueIqrg0Q", "Dario Amodei Made One Mistake. Sam Altman Got $110 Billion. Here's the Full Story."),
    ("2JiMmye2ezg", "You Don't Need SaaS. The $0.10 System That Replaced My AI Workflow (45 Min No-Code Build)"),
    ("RnjgLlQTMf0", "Why Every AI Skill You Learned 6 Months Ago Is Already Wrong (And What Is Replacing Them)"),
    ("2ghhiPLg-jg", "My 10-Year-Old Vibe Codes. She Also Does Math by Hand. Why That's the Only Strategy That Works."),
    ("BpibZSMGtdY", "'Prompting' Just Split Into 4 Skills. You Only Know One. Here's Why You Need the Other 3 in 2026."),
    ("q6pbQ5li5Cg", "Don't Fall For the Stock Market Hype. The $7,000 Raise AI Is Giving You (That Nobody Mentions)"),
]

OUTPUT_DIR = "transcripts/natebjones"

# Create SSL context that doesn't verify certificates (needed in this environment)
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE


def get_transcript_via_api(video_id):
    """Try using youtube_transcript_api library."""
    from youtube_transcript_api import YouTubeTranscriptApi
    ytt_api = YouTubeTranscriptApi()
    transcript = ytt_api.fetch(video_id)
    lines = []
    for snippet in transcript:
        text = snippet.text.replace('\n', ' ').strip()
        if text:
            lines.append(text)
    return ' '.join(lines)


def get_transcript_via_yt_dlp(video_id):
    """Fallback: use yt-dlp to download subtitles."""
    import subprocess
    import tempfile
    with tempfile.TemporaryDirectory() as tmpdir:
        result = subprocess.run([
            'yt-dlp', '--no-check-certificates',
            '--write-auto-sub', '--sub-lang', 'en',
            '--skip-download', '--sub-format', 'vtt',
            '-o', os.path.join(tmpdir, '%(id)s.%(ext)s'),
            f'https://www.youtube.com/watch?v={video_id}'
        ], capture_output=True, text=True, timeout=60)

        # Find the subtitle file
        for f in os.listdir(tmpdir):
            if f.endswith('.vtt'):
                with open(os.path.join(tmpdir, f), 'r') as fh:
                    content = fh.read()
                return parse_vtt(content)
    return None


def parse_vtt(vtt_content):
    """Parse VTT subtitle content into plain text."""
    lines = []
    seen = set()
    for line in vtt_content.split('\n'):
        line = line.strip()
        # Skip timestamps, headers, and empty lines
        if not line or line.startswith('WEBVTT') or line.startswith('Kind:') or line.startswith('Language:'):
            continue
        if '-->' in line:
            continue
        if re.match(r'^\d+$', line):
            continue
        # Remove HTML tags
        clean = re.sub(r'<[^>]+>', '', line)
        clean = clean.strip()
        if clean and clean not in seen:
            seen.add(clean)
            lines.append(clean)
    return ' '.join(lines)


def slugify(title):
    """Convert title to filename-safe slug."""
    slug = title.lower()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    slug = slug.strip('-')
    return slug[:80]


def format_transcript_paragraphs(text):
    """Break transcript text into paragraphs for readability."""
    words = text.split()
    paragraphs = []
    chunk_size = 100  # words per paragraph
    for i in range(0, len(words), chunk_size):
        paragraphs.append(' '.join(words[i:i+chunk_size]))
    return '\n\n'.join(paragraphs)


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    for video_id, title in VIDEOS:
        slug = slugify(title)
        filepath = os.path.join(OUTPUT_DIR, f"{slug}.md")
        url = f"https://www.youtube.com/watch?v={video_id}"

        print(f"Downloading: {title[:60]}...")

        transcript_text = None

        # Try youtube_transcript_api first
        try:
            transcript_text = get_transcript_via_api(video_id)
            print(f"  ✓ Got transcript via API ({len(transcript_text)} chars)")
        except Exception as e:
            print(f"  API failed: {e}")
            # Fallback to yt-dlp
            try:
                transcript_text = get_transcript_via_yt_dlp(video_id)
                if transcript_text:
                    print(f"  ✓ Got transcript via yt-dlp ({len(transcript_text)} chars)")
                else:
                    print(f"  ✗ No transcript available")
            except Exception as e2:
                print(f"  yt-dlp failed: {e2}")

        if transcript_text:
            formatted = format_transcript_paragraphs(transcript_text)
            md_content = f"# {title}\n\n"
            md_content += f"**Channel:** Nate B Jones (AI News & Strategy Daily)\n"
            md_content += f"**Video URL:** {url}\n\n"
            md_content += f"---\n\n"
            md_content += f"## Transcript\n\n"
            md_content += formatted + "\n"

            with open(filepath, 'w') as f:
                f.write(md_content)
            print(f"  Saved to {filepath}")
        else:
            print(f"  SKIPPED - no transcript found")
        print()


if __name__ == '__main__':
    main()
