#!/usr/bin/env python3
"""Grade all eval outputs for design-md-generator skill."""
import json, re, os, sys

WORKSPACE = os.path.dirname(os.path.abspath(__file__))
ITERATION = os.path.join(WORKSPACE, "iteration-1")

EVALS = [
    {"id": 0, "name": "stripe", "dirs": ["stripe-with-skill", "stripe-without-skill"]},
    {"id": 1, "name": "forge", "dirs": ["forge-with-skill", "forge-without-skill"]},
    {"id": 2, "name": "github", "dirs": ["github-with-skill", "github-without-skill"]},
]

def read_file(path):
    try:
        with open(path, 'r') as f:
            return f.read()
    except:
        return ""

def count_sections(md):
    """Count numbered sections (## 1. ... through ## 9. ...)"""
    found = set()
    for m in re.finditer(r'^## (\d+)\.', md, re.MULTILINE):
        found.add(int(m.group(1)))
    return found

def count_hex_colors(md):
    """Count unique hex color codes"""
    return len(set(re.findall(r'`(#[0-9a-fA-F]{6})`', md)))

def count_bold_semantic_names(md):
    """Count bold semantic color names followed by hex codes"""
    return len(re.findall(r'\*\*[A-Z][^*]+\*\*\s*\(`#[0-9a-fA-F]{6}`\)', md))

def count_table_rows(md, section_num):
    """Count data rows in first table found in a given section"""
    # Find section
    pattern = rf'## {section_num}\.'
    match = re.search(pattern, md)
    if not match:
        return 0
    section_start = match.start()
    # Find next section or end
    next_section = re.search(r'^## \d+\.', md[section_start+5:], re.MULTILINE)
    section_text = md[section_start:section_start+5+(next_section.start() if next_section else len(md)-section_start-5)]

    # Find table rows (lines starting with |, excluding header separator)
    rows = [l for l in section_text.split('\n') if l.strip().startswith('|') and not re.match(r'^\|[\s\-:|]+\|$', l.strip())]
    # Subtract header row
    return max(0, len(rows) - 1)

def count_button_variants(md):
    """Count distinct button variant definitions in Section 4"""
    section_match = re.search(r'## 4\.', md)
    if not section_match:
        return 0
    section_start = section_match.start()
    next_section = re.search(r'^## 5\.', md[section_start:], re.MULTILINE)
    section_text = md[section_start:section_start+(next_section.start() if next_section else len(md)-section_start)]

    # Count button definitions (bold headers with parenthetical descriptions)
    buttons = re.findall(r'\*\*[^*]+\*\*\n- Background:', section_text)
    if not buttons:
        buttons = re.findall(r'\*\*[^*]+\(.*?\)\*\*', section_text)
    return len(buttons)

def count_do_dont(md):
    """Count items in Do and Don't lists"""
    section_match = re.search(r'## 7\.', md)
    if not section_match:
        return 0, 0
    section_start = section_match.start()
    next_section = re.search(r'^## 8\.', md[section_start:], re.MULTILINE)
    section_text = md[section_start:section_start+(next_section.start() if next_section else len(md)-section_start)]

    # Split into do and don't sections
    do_section = re.search(r'### Do\b(.*?)### Don', section_text, re.DOTALL)
    dont_section = re.search(r"### Don'?t\b(.*?)($|##)", section_text, re.DOTALL)

    do_count = len(re.findall(r'^- ', do_section.group(1), re.MULTILINE)) if do_section else 0
    dont_count = len(re.findall(r'^- ', dont_section.group(1), re.MULTILINE)) if dont_section else 0
    return do_count, dont_count

def check_breakpoints_table(md):
    """Check if Section 8 has a breakpoints table with 3+ entries"""
    section_match = re.search(r'## 8\.', md)
    if not section_match:
        return 0
    section_start = section_match.start()
    next_section = re.search(r'^## 9\.', md[section_start:], re.MULTILINE)
    section_text = md[section_start:section_start+(next_section.start() if next_section else len(md)-section_start)]

    rows = [l for l in section_text.split('\n') if l.strip().startswith('|') and not re.match(r'^\|[\s\-:|]+\|$', l.strip())]
    return max(0, len(rows) - 1)

def check_border_radius_zero(md):
    """Check if border radius is 0px throughout (for Forge)"""
    section4 = re.search(r'## 4\.(.*?)## 5\.', md, re.DOTALL)
    if not section4:
        return False
    text = section4.group(1)
    # Check all radius mentions are 0px
    radii = re.findall(r'[Rr]adius:\s*(\d+)px', text)
    return all(r == '0' for r in radii) if radii else False

def check_monospace_all(md):
    """Check if Section 3 specifies monospace for all text roles"""
    section3 = re.search(r'## 3\.(.*?)## 4\.', md, re.DOTALL)
    if not section3:
        return False
    text = section3.group(1).lower()
    # Check for monospace font in the font family section
    return 'mono' in text and ('everything' in text or 'all text' in text or 'single' in text)

def check_system_font(md):
    """Check if Section 3 specifies system font stack"""
    section3 = re.search(r'## 3\.(.*?)## 4\.', md, re.DOTALL)
    if not section3:
        return False
    text = section3.group(1)
    return 'apple-system' in text or 'system' in text.lower()

def check_internal_consistency(md):
    """Check that color names in Section 4 appear in Section 2"""
    section2 = re.search(r'## 2\.(.*?)## 3\.', md, re.DOTALL)
    section4 = re.search(r'## 4\.(.*?)## 5\.', md, re.DOTALL)
    if not section2 or not section4:
        return False

    # Extract color names from Section 2
    color_names = set(m.lower() for m in re.findall(r'\*\*([^*]+)\*\*\s*\(`#', section2.group(1)))

    # Check if Section 4 references these names
    s4_text = section4.group(1)
    refs = re.findall(r'(?:Background|Text|Border|Color):\s*(?:\w+ )*(\w[\w ]+)\s*\(`#', s4_text)

    if not refs:
        return True  # No explicit references to check

    matches = sum(1 for r in refs if r.strip().lower() in color_names)
    return matches >= len(refs) * 0.5  # At least 50% match

def grade_eval(eval_id, eval_name, run_dir, expectations):
    """Grade a single run against expectations."""
    outputs_dir = os.path.join(run_dir, "outputs")
    md_path = os.path.join(outputs_dir, "DESIGN.md")
    md = read_file(md_path)

    results = []

    for exp in expectations:
        passed = False
        evidence = ""

        if "all 9 numbered sections" in exp:
            sections = count_sections(md)
            passed = len(sections) >= 9
            evidence = f"Found sections: {sorted(sections)} ({len(sections)}/9)"

        elif "at least 15 unique hex color codes" in exp:
            hex_count = count_hex_colors(md)
            bold_count = count_bold_semantic_names(md)
            passed = hex_count >= 15 and bold_count >= 10
            evidence = f"Found {hex_count} unique hex codes, {bold_count} with bold semantic names"

        elif "markdown table with at least 12 rows" in exp:
            row_count = count_table_rows(md, 3)
            passed = row_count >= 12
            evidence = f"Typography table has {row_count} data rows"

        elif "at least 3 distinct button variants" in exp:
            btn_count = count_button_variants(md)
            passed = btn_count >= 3
            evidence = f"Found {btn_count} button variant definitions"

        elif "elevation table with at least 4 levels" in exp:
            elev_rows = count_table_rows(md, 6)
            passed = elev_rows >= 4
            evidence = f"Elevation table has {elev_rows} rows"

        elif "at least 6 Do items and 6 Don't items" in exp:
            do_count, dont_count = count_do_dont(md)
            passed = do_count >= 6 and dont_count >= 6
            evidence = f"Do: {do_count} items, Don't: {dont_count} items"

        elif "preview.html file exists" in exp:
            path = os.path.join(outputs_dir, "preview.html")
            content = read_file(path)
            passed = len(content) > 100 and '<html' in content.lower()
            evidence = f"preview.html: {len(content)} chars, valid HTML: {'<html' in content.lower()}"

        elif "preview-dark.html file exists" in exp:
            path = os.path.join(outputs_dir, "preview-dark.html")
            content = read_file(path)
            passed = len(content) > 100 and '<html' in content.lower()
            evidence = f"preview-dark.html: {len(content)} chars, valid HTML: {'<html' in content.lower()}"

        elif "Border radius values are 0px" in exp:
            passed = check_border_radius_zero(md)
            evidence = f"All component radii are 0px: {passed}"

        elif "monospace font family for all text" in exp:
            passed = check_monospace_all(md)
            evidence = f"Monospace for all text: {passed}"

        elif "system font stack" in exp:
            passed = check_system_font(md)
            evidence = f"System font stack specified: {passed}"

        elif "semantic names that appear in Section 2" in exp:
            passed = check_internal_consistency(md)
            evidence = f"Internal color consistency: {passed}"

        elif "breakpoints table with at least 3" in exp:
            bp_count = check_breakpoints_table(md)
            passed = bp_count >= 3
            evidence = f"Breakpoints table has {bp_count} entries"

        else:
            evidence = f"No automated check for: {exp}"

        results.append({
            "text": exp,
            "passed": passed,
            "evidence": evidence
        })

    passed_count = sum(1 for r in results if r["passed"])
    total = len(results)

    grading = {
        "expectations": results,
        "summary": {
            "passed": passed_count,
            "failed": total - passed_count,
            "total": total,
            "pass_rate": round(passed_count / total, 2) if total > 0 else 0
        }
    }

    # Save grading.json
    grading_path = os.path.join(run_dir, "grading.json")
    with open(grading_path, 'w') as f:
        json.dump(grading, f, indent=2)

    return grading

# Load expectations from evals.json
evals_path = os.path.join(WORKSPACE, "..", ".claude", "skills", "design-md-generator", "evals", "evals.json")
with open(evals_path) as f:
    evals_data = json.load(f)

eval_expectations = {e["id"]: e["expectations"] for e in evals_data["evals"]}

# Grade all runs
print("Grading all runs...\n")
for eval_info in EVALS:
    eid = eval_info["id"]
    name = eval_info["name"]
    expectations = eval_expectations[eid]

    for run_dir_name in eval_info["dirs"]:
        run_dir = os.path.join(ITERATION, run_dir_name)
        config = "with_skill" if "with-skill" in run_dir_name else "without_skill"

        grading = grade_eval(eid, name, run_dir, expectations)
        summary = grading["summary"]

        print(f"{run_dir_name}: {summary['passed']}/{summary['total']} passed ({summary['pass_rate']:.0%})")
        for exp in grading["expectations"]:
            status = "PASS" if exp["passed"] else "FAIL"
            print(f"  [{status}] {exp['text']}")
            print(f"         {exp['evidence']}")
    print()

print("Done! Grading results saved to grading.json in each run directory.")
