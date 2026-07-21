<#
  contrast-check.ps1 - WCAG contrast ratios for the theme token pairs.

  Slice 1 of issues-light-mode.md. Deliberately tiny and dependency-free:
  no runner, no framework, no stylesheet parsing. It takes pairs of colour
  VALUES and a required ratio and reports what they compute to, so it
  survives any refactor of how the tokens are organised in styles.css.

  The values below must stay in sync with the token blocks in styles.css by
  hand. That is the accepted cost of not parsing the stylesheet - the point
  of this script is to decide the palette, not to test CSS back to itself.

  Usage:  powershell -ExecutionPolicy Bypass -File tools/contrast-check.ps1
  Exits non-zero if any pair is under its bar.
#>

$ErrorActionPreference = 'Stop'

# ---------- colour maths (WCAG 2.x) ----------

function ConvertFrom-Hex {
  param([string]$Hex)
  $h = $Hex.TrimStart('#')
  if ($h.Length -eq 3) { $h = "$($h[0])$($h[0])$($h[1])$($h[1])$($h[2])$($h[2])" }
  return @(
    [Convert]::ToInt32($h.Substring(0, 2), 16),
    [Convert]::ToInt32($h.Substring(2, 2), 16),
    [Convert]::ToInt32($h.Substring(4, 2), 16)
  )
}

function Get-RelativeLuminance {
  param([int[]]$Rgb)
  $lin = $Rgb | ForEach-Object {
    $c = $_ / 255.0
    if ($c -le 0.03928) { $c / 12.92 } else { [Math]::Pow(($c + 0.055) / 1.055, 2.4) }
  }
  return 0.2126 * $lin[0] + 0.7152 * $lin[1] + 0.0722 * $lin[2]
}

function Get-ContrastRatio {
  param([string]$Fg, [string]$Bg)
  $l1 = Get-RelativeLuminance (ConvertFrom-Hex $Fg)
  $l2 = Get-RelativeLuminance (ConvertFrom-Hex $Bg)
  if ($l1 -lt $l2) { $t = $l1; $l1 = $l2; $l2 = $t }
  return ($l1 + 0.05) / ($l2 + 0.05)
}

# Flatten a translucent colour over an opaque one. Used for the nav scrim,
# whose effective ground is a gradient stop composited over whatever is
# behind it (worst case on the Void: a bright frame).
function Get-Composite {
  param([string]$Over, [double]$Alpha, [string]$Under)
  $o = ConvertFrom-Hex $Over
  $u = ConvertFrom-Hex $Under
  $mix = 0..2 | ForEach-Object { [Math]::Round($o[$_] * $Alpha + $u[$_] * (1 - $Alpha)) }
  return '#{0:x2}{1:x2}{2:x2}' -f [int]$mix[0], [int]$mix[1], [int]$mix[2]
}

# ---------- the palette ----------

$Dark = @{
  bg         = '#0a0a0a'   # --bg          page ground
  bgDeep     = '#080808'   # --bg-deep     Void clear colour / loader
  surface    = '#141412'   # --surface     raised surface
  ink        = '#f3ede1'   # --ink         body text
  muted      = '#8c887e'   # --muted       secondary text
  accent     = '#e3b23c'   # --accent      gold that must be READ
  accentDim  = '#a8822c'   # --accent-dim  decorative / large gold
  accentFill = '#e3b23c'   # --accent-fill bright brand gold, large fills
  fillInk    = '#0a0a0a'   # label colour ON the fill, both themes
}

$Light = @{
  bg         = '#faf7ef'   # paper, lifted from --cream
  bgDeep     = '#f4f0e6'   # light Void space - a step below page paper
  surface    = '#f3ede1'   # --cream itself becomes the raised surface
  ink        = '#171512'   # warm near-black ink
  muted      = '#6e6a5e'   # secondary text on paper
  # The plan proposed #8a6a1f for --accent. It clears the text bar on paper
  # (4.71:1) but NOT on the raised surface (4.33:1), which is where gold labels
  # actually sit on a Listing card. Darkened one step, hue kept; #8a6a1f is
  # demoted to --accent-dim, where the 3:1 UI bar it comfortably clears is the
  # right bar for decorative gold.
  accent     = '#7a5d15'   # gold-ink: ochre that must clear the TEXT bar
  accentDim  = '#8a6a1f'   # decorative / large gold on paper
  accentFill = '#e3b23c'   # bright brand gold retained for large fills
  fillInk    = '#0a0a0a'   # dark ink on the gold fill
}

# The nav scrim's worst case: the top gradient stop over a blown-out frame
# drifting behind the Void nav. Slice 6 sets the stop alpha; keep in sync.
# The plan proposed 0.55. Against a pure-white frame that leaves dark-theme
# nav type at 3.79:1 - under the text bar. 0.60 lands exactly on 4.50 with no
# margin for a rounding difference in the gradient; 0.65 clears it at 5.39:1
# and still reads as a soft short scrim because the gradient is transparent
# by 60% of its height.
$ScrimAlpha = 0.65
$WorstFrame = '#ffffff'

$BAR_TEXT = 4.5   # body copy AND the nav's 12px letterspaced type
$BAR_UI   = 3.0   # graphical objects, hairlines, decorative gold

$pairs = @(
  # --- dark theme ---
  @{ Theme = 'dark';  Name = 'ink on ground';            Fg = $Dark.ink;        Bg = $Dark.bg;      Bar = $BAR_TEXT }
  @{ Theme = 'dark';  Name = 'ink on surface';           Fg = $Dark.ink;        Bg = $Dark.surface; Bar = $BAR_TEXT }
  @{ Theme = 'dark';  Name = 'ink on Void space';        Fg = $Dark.ink;        Bg = $Dark.bgDeep;  Bar = $BAR_TEXT }
  @{ Theme = 'dark';  Name = 'muted on ground';          Fg = $Dark.muted;      Bg = $Dark.bg;      Bar = $BAR_TEXT }
  @{ Theme = 'dark';  Name = 'muted on surface';         Fg = $Dark.muted;      Bg = $Dark.surface; Bar = $BAR_TEXT }
  @{ Theme = 'dark';  Name = 'accent on ground';         Fg = $Dark.accent;     Bg = $Dark.bg;      Bar = $BAR_TEXT }
  @{ Theme = 'dark';  Name = 'accent on surface';        Fg = $Dark.accent;     Bg = $Dark.surface; Bar = $BAR_TEXT }
  @{ Theme = 'dark';  Name = 'accent-dim on ground';     Fg = $Dark.accentDim;  Bg = $Dark.bg;      Bar = $BAR_UI   }
  @{ Theme = 'dark';  Name = 'ink label on gold fill';   Fg = $Dark.fillInk;    Bg = $Dark.accentFill; Bar = $BAR_TEXT }
  @{ Theme = 'dark';  Name = 'nav type over scrim';      Fg = $Dark.ink;        Bg = (Get-Composite $Dark.bg $ScrimAlpha $WorstFrame); Bar = $BAR_TEXT }

  # --- light theme ---
  @{ Theme = 'light'; Name = 'ink on ground';            Fg = $Light.ink;       Bg = $Light.bg;      Bar = $BAR_TEXT }
  @{ Theme = 'light'; Name = 'ink on surface';           Fg = $Light.ink;       Bg = $Light.surface; Bar = $BAR_TEXT }
  @{ Theme = 'light'; Name = 'ink on Void space';        Fg = $Light.ink;       Bg = $Light.bgDeep;  Bar = $BAR_TEXT }
  @{ Theme = 'light'; Name = 'muted on ground';          Fg = $Light.muted;     Bg = $Light.bg;      Bar = $BAR_TEXT }
  @{ Theme = 'light'; Name = 'muted on surface';         Fg = $Light.muted;     Bg = $Light.surface; Bar = $BAR_TEXT }
  @{ Theme = 'light'; Name = 'accent on ground';         Fg = $Light.accent;    Bg = $Light.bg;      Bar = $BAR_TEXT }
  @{ Theme = 'light'; Name = 'accent on surface';        Fg = $Light.accent;    Bg = $Light.surface; Bar = $BAR_TEXT }
  @{ Theme = 'light'; Name = 'accent on Void space';     Fg = $Light.accent;    Bg = $Light.bgDeep;  Bar = $BAR_TEXT }
  @{ Theme = 'light'; Name = 'accent-dim on ground';     Fg = $Light.accentDim; Bg = $Light.bg;      Bar = $BAR_UI   }
  @{ Theme = 'light'; Name = 'ink label on gold fill';   Fg = $Light.fillInk;   Bg = $Light.accentFill; Bar = $BAR_TEXT }
  @{ Theme = 'light'; Name = 'nav type over scrim';      Fg = $Light.ink;       Bg = (Get-Composite $Light.bg $ScrimAlpha '#000000'); Bar = $BAR_TEXT }
)

# ---------- report ----------

$fails = 0
$currentTheme = ''

Write-Host ''
Write-Host '  Contrast - light mode token pairs' -ForegroundColor White
Write-Host '  text >= 4.5:1   ui >= 3:1   (nav 12px type gets NO large-text exemption)'
Write-Host ''

foreach ($p in $pairs) {
  if ($p.Theme -ne $currentTheme) {
    $currentTheme = $p.Theme
    Write-Host ''
    Write-Host "  [$currentTheme]" -ForegroundColor Cyan
  }
  $ratio = Get-ContrastRatio $p.Fg $p.Bg
  $pass = $ratio -ge $p.Bar
  if (-not $pass) { $fails++ }
  $mark = if ($pass) { 'PASS' } else { 'FAIL' }
  $colour = if ($pass) { 'Green' } else { 'Red' }
  $line = '    {0,-24} {1} on {2}  {3,6:N2}:1  (needs {4:N1})  ' -f $p.Name, $p.Fg, $p.Bg, $ratio, $p.Bar
  Write-Host $line -NoNewline
  Write-Host $mark -ForegroundColor $colour
}

Write-Host ''
if ($fails -gt 0) {
  Write-Host "  $fails pair(s) under bar. Shift the VALUE, keep the HUE - never lower the bar." -ForegroundColor Red
  Write-Host ''
  exit 1
}
Write-Host '  All pairs clear their bar.' -ForegroundColor Green
Write-Host ''
exit 0
