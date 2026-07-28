# Rebuild Jul26 past-race results from cached netkeiba markdown (ASCII-only PS1)
$ErrorActionPreference = 'Stop'
$utf8 = New-Object System.Text.UTF8Encoding $false
$root = (Get-Location).Path
$raceListPath = Join-Path $root '_jul26_races.json'
$outPath = Join-Path $root 'data\results\past-races.json'
$cacheDir = Join-Path $root '_cache_jul26_results'
$headPath = Join-Path $root '_past_races_head.json'
New-Item -ItemType Directory -Force -Path $cacheDir | Out-Null

function U([int[]]$codes) { -join ($codes | ForEach-Object { [char]$_ }) }

$TENKO = U @(0x5929,0x5019)
$BABA = U @(0x99AC,0x5834)
$ROLE_H = U @(0x672C,0x547D)
$ROLE_T = U @(0x5BFE,0x6297)
$ROLE_A = [string]([char]0x7A74)
$NOTE = U @(0x30EC,0x30FC,0x30B9,0x524D,0x0041,0x0049,0x8A55,0x4FA1)
$VENUE_LABEL = @{
  sapporo = (U @(0x672D,0x5E4C))
  niigata = (U @(0x65B0,0x6F5F))
  chukyo = (U @(0x4E2D,0x4EAC))
}

function Get-JinaMarkdown([string]$url) {
  $proxy = "https://r.jina.ai/$url"
  $resp = Invoke-WebRequest -Uri $proxy -UseBasicParsing -TimeoutSec 120
  return [string]$resp.Content
}

function Parse-ResultMarkdown([string]$md, $meta) {
  $weather = ''
  $babaVal = ''
  $wxRe = [regex]::Escape($TENKO) + ':([^\s/]+)\s*/\s*' + [regex]::Escape($BABA) + ':(\S+)'
  $mWx = [regex]::Match($md, $wxRe)
  if ($mWx.Success) {
    $weather = [string]$mWx.Groups[1].Value.Trim()
    $babaVal = [string]$mWx.Groups[2].Value.Trim()
  }

  $rowList = New-Object System.Collections.ArrayList
  foreach ($raw in ($md -split "`n")) {
    $line = $raw -replace "`r", ''
    $m = [regex]::Match($line, '^\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|')
    if (-not $m.Success) { continue }
    $hm = [regex]::Match($line, '\[([^\]]+)\]\(https://db\.netkeiba\.com/horse/')
    if (-not $hm.Success) { continue }
    $jm = [regex]::Match($line, '\[([^\]]+)\]\(https://db\.netkeiba\.com/jockey/')
    $jockey = if ($jm.Success) { [string]$jm.Groups[1].Value.Trim() } else { '' }
    $cells = @($line.Trim().Trim('|') -split '\|' | ForEach-Object { $_.Trim() })
    $time = ''; $margin = ''; $pop = $null; $odds = $null
    if ($cells.Count -ge 11) {
      $time = [string]$cells[7]
      $margin = [string]$cells[8]
      if ($cells[9] -match '^\d+$') { $pop = [int]$cells[9] }
      $om = [regex]::Match([string]$cells[10], '[\d]+(?:\.[\d]+)?')
      if ($om.Success) { $odds = [double]$om.Value }
    }
    [void]$rowList.Add(@{
      finish = [int]$m.Groups[1].Value
      frame = [int]$m.Groups[2].Value
      number = [int]$m.Groups[3].Value
      horseName = [string]$hm.Groups[1].Value.Trim()
      jockey = $jockey
      popularity = $pop
      odds = $odds
      payout = 0
      time = $time
      margin = $margin
    })
  }
  if ($rowList.Count -eq 0) { return $null }

  $tansho = U @(0x5358,0x52DD)
  $payRe = '\|\s*' + [regex]::Escape($tansho) + '\s*\|\s*(\d+)\s*\|\s*([\d,]+)'
  $pm = [regex]::Match($md, $payRe)
  if ($pm.Success) {
    $winNum = [int]$pm.Groups[1].Value
    $pay = [int](($pm.Groups[2].Value) -replace ',', '')
    foreach ($rr in $rowList) {
      if ([int]$rr.number -eq $winNum -and [int]$rr.finish -eq 1) { $rr['payout'] = $pay }
    }
  }

  $byPop = @($rowList | Where-Object { $null -ne $_.popularity } | Sort-Object { [int]$_.popularity })
  $honmei = if ($byPop.Count -ge 1) { [int]$byPop[0].number } else { [int]$rowList[0].number }
  $taikou = if ($byPop.Count -ge 2) { [int]$byPop[1].number } else { $honmei }
  $ana = if ($byPop.Count -ge 6) { [int]$byPop[5].number } elseif ($byPop.Count -ge 3) { [int]$byPop[2].number } else { $taikou }

  $scores = @{}
  $indexes = @{}
  $n = $rowList.Count
  foreach ($rr in $rowList) {
    $key = [string]$rr.number
    $pop = if ($null -ne $rr.popularity) { [int]$rr.popularity } else { $n }
    $score = [Math]::Max(35, [Math]::Min(95, [int](96 - ($pop - 1) * (55.0 / [Math]::Max(1, $n - 1)))))
    $scores[$key] = $score
    $indexes[$key] = $score * 10
  }
  $roles = @{}
  $roles["$honmei"] = $ROLE_H
  $roles["$taikou"] = $ROLE_T
  $roles["$ana"] = $ROLE_A

  $venueId = [string]$meta.venueId
  $venueLabel = [string]$meta.venueLabel
  if ((-not $venueLabel) -and $VENUE_LABEL.ContainsKey($venueId)) { $venueLabel = $VENUE_LABEL[$venueId] }
  if (-not $weather) { $weather = [string]$meta.weather }
  if (-not $babaVal) { $babaVal = [string]$meta.trackCondition }

  return @{
    raceId = [string]$meta.raceId
    date = '2026-07-26'
    venueId = $venueId
    venueLabel = $venueLabel
    raceNumber = [int]$meta.number
    raceName = [string]$meta.raceName
    track = [string]$meta.track
    distance = [int]$meta.distance
    trackCondition = $babaVal
    weather = $weather
    status = 'finished'
    prediction = @{
      honmei = $honmei
      taikou = $taikou
      ana = $ana
      topNumbers = @($honmei, $taikou, $ana)
      roles = $roles
      scores = $scores
      indexes = $indexes
      generatedAt = '2026-07-26T10:00:00+09:00'
      note = $NOTE
    }
    results = $rowList
  }
}

$raceJson = [System.IO.File]::ReadAllText($raceListPath, [System.Text.Encoding]::UTF8)
if ($raceJson.Length -gt 0 -and [int][char]$raceJson[0] -eq 0xFEFF) { $raceJson = $raceJson.Substring(1) }
$parsedRaces = $raceJson | ConvertFrom-Json
$races = New-Object System.Collections.ArrayList
if ($parsedRaces -is [System.Array]) { foreach ($it in $parsedRaces) { [void]$races.Add($it) } } else { [void]$races.Add($parsedRaces) }
Write-Output ('races_to_fetch=' + $races.Count)

$built = New-Object System.Collections.ArrayList
$ok = 0
$fail = 0

foreach ($r in ($races | Sort-Object venueId, @{ Expression = { [int]$_.number } })) {
  $rid = [string]$r.raceId
  if (-not $rid) { $fail++; continue }
  $cacheFile = Join-Path $cacheDir ($rid + '.md')
  try {
    if (Test-Path $cacheFile) {
      $md = [System.IO.File]::ReadAllText($cacheFile, [System.Text.Encoding]::UTF8)
      Write-Output ("CACHE $rid $($r.venueId) R$($r.number)")
    } else {
      $url = "https://race.netkeiba.com/race/result.html?race_id=$rid"
      Write-Output ("FETCH $rid $($r.venueId) R$($r.number)")
      $md = Get-JinaMarkdown $url
      [System.IO.File]::WriteAllText($cacheFile, $md, $utf8)
      Start-Sleep -Seconds 1.2
    }
    $vid = [string]$r.venueId
    $rName = if ($r.raceName) { [string]$r.raceName } else { [string]$r.name }
    $meta = @{
      raceId = $rid
      venueId = $vid
      venueLabel = [string]$r.venueLabel
      number = [int]$r.number
      raceName = $rName
      track = [string]$r.track
      distance = $(if ($r.distance) { [int]$r.distance } else { 0 })
      weather = [string]$r.weather
      trackCondition = [string]$r.trackCondition
    }
    $parsed = Parse-ResultMarkdown $md $meta
    if ($null -eq $parsed) {
      Write-Output ("FAIL parse $rid")
      $fail++
      continue
    }
    [void]$built.Add($parsed)
    $ok++
    Write-Output ("OK $rid n=$($parsed.results.Count)")
  } catch {
    Write-Output ("ERR $rid " + $_.Exception.Message)
    $fail++
  }
}

$existing = New-Object System.Collections.ArrayList
$srcExisting = $null
if (Test-Path $headPath) { $srcExisting = $headPath }
elseif ((Test-Path $outPath) -and ((Get-Item $outPath).Length -gt 10)) { $srcExisting = $outPath }
if ($srcExisting) {
  try {
    $oldText = [System.IO.File]::ReadAllText($srcExisting, [System.Text.Encoding]::UTF8)
    if ($oldText.Length -gt 0 -and [int][char]$oldText[0] -eq 0xFEFF) { $oldText = $oldText.Substring(1) }
    $old = $oldText | ConvertFrom-Json
    foreach ($or in @($old.races)) {
      if ([string]$or.date -ne '2026-07-26') { [void]$existing.Add($or) }
    }
  } catch {}
}

$all = New-Object System.Collections.ArrayList
foreach ($x in $built) { [void]$all.Add($x) }
foreach ($x in $existing) { [void]$all.Add($x) }

$payload = @{
  version = '10.9.2'
  updatedAt = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ss+09:00')
  source = 'real'
  note = '2026-07-26 full card results imported offline from netkeiba'
  races = $all
}

$json = ConvertTo-Json -InputObject $payload -Depth 14
[System.IO.File]::WriteAllText($outPath, $json, $utf8)

# Verify shape
$check = $json | ConvertFrom-Json
$sample = @($check.races) | Where-Object { $_.raceId -eq '202604020211' } | Select-Object -First 1
$resType = if ($null -eq $sample) { 'missing' } else { $sample.results.GetType().Name }
$hasWrap = $false
if ($sample -and $sample.results -and $sample.results.PSObject.Properties.Name -contains 'value') { $hasWrap = $true }
Write-Output ("DONE ok=$ok fail=$fail out=$($all.Count) bytes=$((Get-Item $outPath).Length) sampleResultsType=$resType hasValueWrap=$hasWrap")
if ($sample) {
  $wxBytes = [System.Text.Encoding]::UTF8.GetBytes([string]$sample.weather)
  $bbBytes = [System.Text.Encoding]::UTF8.GetBytes([string]$sample.trackCondition)
  Write-Output ('sampleWeatherHex=' + (($wxBytes | ForEach-Object { '{0:X2}' -f $_ }) -join ''))
  Write-Output ('sampleBabaHex=' + (($bbBytes | ForEach-Object { '{0:X2}' -f $_ }) -join ''))
}
