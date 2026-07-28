# ASCII-only Aug 1-2 importer
$ErrorActionPreference = 'Stop'
$utf8 = New-Object System.Text.UTF8Encoding $false
$root = (Get-Location).Path
$cache = Join-Path $root '_cache_aug_shutuba'
$listCache = Join-Path $root '_cache_aug_lists'
New-Item -ItemType Directory -Force -Path $cache | Out-Null

function U([int[]]$codes) { -join ($codes | ForEach-Object { [char]$_ }) }

$SHIBA = U @(0x829D)
$DART = U @(0x30C0,0x30FC,0x30C8)
$DA = U @(0x30C0)
$SHO = U @(0x969C)
$MIHO = U @(0x7F8E,0x6D66)
$RITTO = U @(0x6817,0x6771)
$HASSO = U @(0x767A,0x8D70)

$VENUE = @{
  '01' = @{ venueId='sapporo'; label=(U @(0x672D,0x5E4C)) }
  '02' = @{ venueId='hakodate'; label=(U @(0x51FD,0x9928)) }
  '03' = @{ venueId='fukushima'; label=(U @(0x798F,0x5CF6)) }
  '04' = @{ venueId='niigata'; label=(U @(0x65B0,0x6F5F)) }
  '05' = @{ venueId='tokyo'; label=(U @(0x6771,0x4EAC)) }
  '06' = @{ venueId='nakayama'; label=(U @(0x4E2D,0x5C71)) }
  '07' = @{ venueId='chukyo'; label=(U @(0x4E2D,0x4EAC)) }
  '08' = @{ venueId='kyoto'; label=(U @(0x4EAC,0x90FD)) }
  '09' = @{ venueId='hanshin'; label=(U @(0x962A,0x795E)) }
  '10' = @{ venueId='kokura'; label=(U @(0x5C0F,0x5009)) }
}

function Parse-RaceId([string]$rid) {
  $id = ($rid -replace '\D','')
  if ($id.Length -ne 12) { return $null }
  $code = $id.Substring(4,2)
  $v = $VENUE[$code]
  if (-not $v) { $v = @{ venueId=('v'+$code); label=$code } }
  return @{
    raceId=$id; year=$id.Substring(0,4); venueCode=$code
    venueId=$v.venueId; venueLabel=$v.label
    kai=[int]$id.Substring(6,2); day=[int]$id.Substring(8,2); number=[int]$id.Substring(10,2)
  }
}

function Fetch-Jina([string]$url, [string]$outFile) {
  if (Test-Path $outFile) {
    return [System.IO.File]::ReadAllText($outFile, [System.Text.Encoding]::UTF8)
  }
  Write-Output ('FETCH ' + $url)
  $resp = Invoke-WebRequest -Uri ('https://r.jina.ai/' + $url) -UseBasicParsing -TimeoutSec 120
  $md = [string]$resp.Content
  [System.IO.File]::WriteAllText($outFile, $md, $utf8)
  Start-Sleep -Seconds 1.1
  return $md
}

function Parse-ListRaces([string]$md, [string]$dateIso) {
  $races = New-Object System.Collections.ArrayList
  $seen = @{}
  $surfClass = [regex]::Escape($SHIBA) + '|' + [regex]::Escape($DART) + '|' + [regex]::Escape($DA) + '|' + [regex]::Escape($SHO)
  $re = '\[(\d+)R\s+(.+?)\s+(' + $surfClass + ')(\d+)m\s+(\d+).{1,3}\].*?race_id=(\d{12})'
  foreach ($line in ($md -split "`n")) {
    if ($line -notmatch 'race_id=(\d{12})') { continue }
    $rid = $Matches[1]
    if ($seen.ContainsKey($rid)) { continue }
    $m = [regex]::Match($line, $re)
    $meta = Parse-RaceId $rid
    if (-not $meta) { continue }
    $seen[$rid] = $true
    if ($m.Success) {
      $surf = $m.Groups[3].Value
      if ($surf -eq $DA) { $surf = $DART }
      [void]$races.Add(@{
        date=$dateIso; venueId=$meta.venueId; venueLabel=$meta.venueLabel
        kai=$meta.kai; day=$meta.day; totalDays=8
        number=[int]$m.Groups[1].Value; raceName=$m.Groups[2].Value.Trim()
        startTime=''; surface=$surf; distance=[int]$m.Groups[4].Value
        courseDirection=''; raceClass=$m.Groups[2].Value.Trim(); grade='B'
        ageCondition=''; fieldSize=[int]$m.Groups[5].Value; defaultStage=2
        weather=''; trackCondition=''; raceId=$rid
        sourceUrl=('https://race.netkeiba.com/race/shutuba.html?race_id=' + $rid)
      })
    } else {
      [void]$races.Add(@{
        date=$dateIso; venueId=$meta.venueId; venueLabel=$meta.venueLabel
        kai=$meta.kai; day=$meta.day; totalDays=8; number=$meta.number
        raceName=('R'+$meta.number); startTime=''; surface=''; distance=0
        courseDirection=''; raceClass=('R'+$meta.number); grade='B'
        ageCondition=''; fieldSize=0; defaultStage=2; weather=''; trackCondition=''
        raceId=$rid; sourceUrl=('https://race.netkeiba.com/race/shutuba.html?race_id=' + $rid)
      })
    }
  }
  return $races
}

function Parse-Shutuba([string]$md, $meta) {
  $entries = New-Object System.Collections.ArrayList
  $raceName=''; $startTime=''; $surface=''; $distance=0
  $nm = [regex]::Match($md, '(?m)^#\s+(.+)$')
  if ($nm.Success) { $raceName = $nm.Groups[1].Value.Trim() }
  $im = [regex]::Match($md, '(\d{1,2}:\d{2})' + [regex]::Escape($HASSO) + '\s*/\s*(' + [regex]::Escape($SHIBA) + '|' + [regex]::Escape($DA) + '|' + [regex]::Escape($SHO) + '|' + [regex]::Escape($DART) + ')(\d+)m')
  if ($im.Success) {
    $startTime = $im.Groups[1].Value
    $surface = $im.Groups[2].Value
    if ($surface -eq $DA) { $surface = $DART }
    $distance = [int]$im.Groups[3].Value
  }

  $sexRe = '(' + ([char]0x7261) + '|' + ([char]0x726C) + '|' + ([char]0x30BB) + ')\s*(\d+)'

  foreach ($raw in ($md -split "`n")) {
    $line = $raw -replace "`r",''
    if ($line -notmatch '^\|') { continue }
    if ($line -notmatch 'db\.netkeiba\.com/horse/') { continue }
    $cols = @($line.Trim().Trim('|') -split '\|' | ForEach-Object { $_.Trim() })
    if ($cols.Count -lt 6) { continue }

    $frame=$null; $number=$null; $horseCell=''; $sexAge=''; $weight=$null
    $jockeyCell=''; $trainerCell=''; $odds=$null; $pop=$null; $provisional=$false
    $fTry=0; $nTry=0
    $okClassic = [int]::TryParse($cols[0], [ref]$fTry) -and [int]::TryParse($cols[1], [ref]$nTry)
    if ($okClassic -and $cols.Count -ge 8) {
      $frame=$fTry; $number=$nTry; $horseCell=$cols[3]; $sexAge=$cols[4]
      $w=0.0; if ([double]::TryParse($cols[5], [ref]$w)) { $weight=$w }
      $jockeyCell=$cols[6]; $trainerCell=$cols[7]
      $o=0.0; if ($cols.Count -gt 9 -and [double]::TryParse($cols[9], [ref]$o)) { $odds=$o }
      $p=0; if ($cols.Count -gt 10 -and [int]::TryParse($cols[10], [ref]$p)) { $pop=$p }
    } else {
      $horseIdx=-1
      for ($i=0; $i -lt $cols.Count; $i++) {
        if ($cols[$i] -match 'db\.netkeiba\.com/horse/') { $horseIdx=$i; break }
      }
      if ($horseIdx -lt 0) { continue }
      $provisional=$true; $horseCell=$cols[$horseIdx]
      if ($horseIdx+1 -lt $cols.Count) { $sexAge=$cols[$horseIdx+1] }
      $w=0.0; if ($horseIdx+2 -lt $cols.Count -and [double]::TryParse($cols[$horseIdx+2], [ref]$w)) { $weight=$w }
      if ($horseIdx+3 -lt $cols.Count) { $jockeyCell=$cols[$horseIdx+3] }
      if ($horseIdx+4 -lt $cols.Count) { $trainerCell=$cols[$horseIdx+4] }
      $o=0.0; if ($horseIdx+6 -lt $cols.Count -and [double]::TryParse($cols[$horseIdx+6], [ref]$o)) { $odds=$o }
      $p=0; if ($horseIdx+7 -lt $cols.Count -and [int]::TryParse($cols[$horseIdx+7], [ref]$p)) { $pop=$p }
    }

    $hm = [regex]::Match($horseCell, '"([^"]+)"')
    if (-not $hm.Success) { $hm = [regex]::Match($horseCell, '\[([^\]!]+)') }
    $horseName = if ($hm.Success) { $hm.Groups[1].Value.Trim() } else { '' }
    $hidm = [regex]::Match($horseCell, 'horse/(\d+)')
    $horseId = if ($hidm.Success) { $hidm.Groups[1].Value } else { '' }
    $sm = [regex]::Match($sexAge, $sexRe)
    $sex = if ($sm.Success) { $sm.Groups[1].Value } else { '' }
    $age = if ($sm.Success) { [int]$sm.Groups[2].Value } else { $null }
    $jm = [regex]::Match($jockeyCell, '\[([^\]]+)\]')
    $jockey = if ($jm.Success) { $jm.Groups[1].Value } else { '' }
    $aff = ''
    if ($trainerCell.StartsWith($MIHO)) { $aff = $MIHO }
    elseif ($trainerCell.StartsWith($RITTO)) { $aff = $RITTO }
    $tm = [regex]::Match($trainerCell, '\[([^\]]+)\]')
    $trainer = if ($tm.Success) { $tm.Groups[1].Value } else { '' }
    if (-not $horseName) { continue }

    [void]$entries.Add(@{
      horseId=$horseId; horseName=$horseName; number=$number; frame=$frame
      sex=$sex; age=$age; weight=$weight; carriedWeight=$weight
      jockey=$jockey; trainer=$trainer; affiliation=$aff
      entryStatus=$(if ($provisional) { 'registered' } else { 'confirmed' })
      runningStyle=''; lastRace=''; last3=@(); winRate=0; placeRate=0
      grade=''; stars=0; trackType=$surface; distanceType=''
      popularity=$pop; odds=$odds; provisionalDraw=$provisional
    })
  }

  $needNum = $false
  foreach ($e in $entries) { if ($null -eq $e.number) { $needNum = $true; break } }
  if ($needNum) {
    for ($i=0; $i -lt $entries.Count; $i++) {
      if ($null -eq $entries[$i].number) { $entries[$i].number = $i + 1 }
      if ($null -eq $entries[$i].frame) {
        $entries[$i].frame = [Math]::Min(8, [Math]::Ceiling((($i + 1) * 8.0) / [Math]::Max(1, $entries.Count)))
      }
    }
  }

  $oddsRows = New-Object System.Collections.ArrayList
  foreach ($e in $entries) {
    [void]$oddsRows.Add(@{
      number=$e.number; horse=$e.horseName; horseName=$e.horseName
      winOdds=$e.odds; placeOdds=$null; popularity=$e.popularity
      marketIndex=$null; updatedAt=(Get-Date).ToString('yyyy-MM-ddTHH:mm:ss+09:00'); history=@()
    })
  }

  return @{
    raceMeta = @{
      raceName=$raceName; startTime=$startTime; surface=$surface; distance=$distance
      fieldSize=$entries.Count; drawPending=$needNum
      defaultStage=$(if ($needNum) { 2 } else { 5 })
    }
    entries=$entries; odds=$oddsRows
  }
}

$allListRaces = New-Object System.Collections.ArrayList
foreach ($pair in @(
  @{ k='20260801'; iso='2026-08-01' },
  @{ k='20260802'; iso='2026-08-02' }
)) {
  $listFile = Join-Path $listCache ('list_' + $pair.k + '.md')
  if (-not (Test-Path $listFile)) {
    [void](Fetch-Jina ('https://race.netkeiba.com/top/race_list.html?kaisai_date=' + $pair.k) $listFile)
  }
  $md = [System.IO.File]::ReadAllText($listFile, [System.Text.Encoding]::UTF8)
  $parsed = Parse-ListRaces $md $pair.iso
  Write-Output ('list ' + $pair.iso + ' races=' + $parsed.Count)
  foreach ($r in $parsed) { [void]$allListRaces.Add($r) }
}

$entryRaces = New-Object System.Collections.ArrayList
$oddsRaces = New-Object System.Collections.ArrayList
$ok=0; $fail=0

foreach ($r in ($allListRaces | Sort-Object date, venueId, number)) {
  $rid = [string]$r.raceId
  $cacheFile = Join-Path $cache ($rid + '.md')
  try {
    $md = Fetch-Jina ('https://race.netkeiba.com/race/shutuba.html?race_id=' + $rid) $cacheFile
    $meta = Parse-RaceId $rid
    $parsed = Parse-Shutuba $md $meta
    if ($parsed.entries.Count -eq 0) {
      Write-Output ('FAIL empty ' + $rid)
      $fail++; continue
    }
    if ($parsed.raceMeta.raceName) { $r.raceName = $parsed.raceMeta.raceName }
    if ($parsed.raceMeta.startTime) { $r.startTime = $parsed.raceMeta.startTime }
    if ($parsed.raceMeta.surface) { $r.surface = $parsed.raceMeta.surface }
    if ($parsed.raceMeta.distance) { $r.distance = $parsed.raceMeta.distance }
    $r.fieldSize = $parsed.raceMeta.fieldSize
    $r.defaultStage = $parsed.raceMeta.defaultStage
    $r.raceClass = $r.raceName

    [void]$entryRaces.Add(@{
      raceId=$rid; raceDate=$r.date; venueId=$r.venueId; venueLabel=$r.venueLabel
      raceNumber=[int]$r.number; raceName=$r.raceName
      defaultStage=[int]$r.defaultStage; drawPending=[bool]$parsed.raceMeta.drawPending
      entries=$parsed.entries
    })
    [void]$oddsRaces.Add(@{
      raceId=$rid; raceDate=$r.date; venueId=$r.venueId; raceNumber=[int]$r.number
      phase='preview'; odds=$parsed.odds
    })
    $ok++
    Write-Output ('OK ' + $rid + ' n=' + $parsed.entries.Count + ' ' + $r.venueId + ' R' + $r.number)
  } catch {
    Write-Output ('ERR ' + $rid + ' ' + $_.Exception.Message)
    $fail++
  }
}

$oldEntriesPath = Join-Path $root 'data\horse\entries.json'
if (Test-Path $oldEntriesPath) {
  try {
    $oldText = [System.IO.File]::ReadAllText($oldEntriesPath, [System.Text.Encoding]::UTF8)
    $old = $oldText | ConvertFrom-Json
    if ($old.raceId -and $old.entries) {
      $exists = $false
      foreach ($er in $entryRaces) { if ($er.raceId -eq [string]$old.raceId) { $exists=$true; break } }
      if (-not $exists) {
        [void]$entryRaces.Add(@{
          raceId=[string]$old.raceId; raceDate=[string]$old.raceDate; venueId=[string]$old.venueId
          raceNumber=[int]$old.raceNumber; defaultStage=5; drawPending=$false; entries=@($old.entries)
        })
        Write-Output ('KEEP ' + $old.raceId)
      }
    }
  } catch {}
}

$updatedAt = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ss+09:00')
$entriesPayload = @{
  version='10.10.0'; source='real'; providerId='real-horse'; updatedAt=$updatedAt
  note='Multi-race catalog for 2026-08-01/02 shutuba (provisional draw allowed)'
  races=$entryRaces
}
$oddsPayload = @{
  version='10.10.0'; source='real'; providerId='real-odds'; providerName='Real Odds (shutuba preview)'
  updatedAt=$updatedAt; fetchedAt=$updatedAt
  note='Preview odds from shutuba for 2026-08-01/02'
  races=$oddsRaces
}

$entriesJson = ConvertTo-Json -InputObject $entriesPayload -Depth 14
$oddsJson = ConvertTo-Json -InputObject $oddsPayload -Depth 14
[System.IO.File]::WriteAllText((Join-Path $root 'data\horse\entries.json'), $entriesJson, $utf8)
[System.IO.File]::WriteAllText((Join-Path $root 'data\entry\real-entries.json'), $entriesJson, $utf8)
[System.IO.File]::WriteAllText((Join-Path $root 'data\odds\odds.json'), $oddsJson, $utf8)
[System.IO.File]::WriteAllText((Join-Path $root 'data\odds\real-odds.json'), $oddsJson, $utf8)

$calPath = Join-Path $root 'data\calendar\calendar.json'
$cal = [System.IO.File]::ReadAllText($calPath, [System.Text.Encoding]::UTF8) | ConvertFrom-Json
$kept = New-Object System.Collections.ArrayList
foreach ($cr in @($cal.races)) {
  if ($cr.date -ne '2026-08-01' -and $cr.date -ne '2026-08-02') { [void]$kept.Add($cr) }
}
foreach ($r in ($allListRaces | Sort-Object date, venueId, number)) { [void]$kept.Add($r) }
$calObj = @{
  version='10.10.0'; source=$cal.source; venues=$cal.venues; providerId=$cal.providerId
  meetings=$cal.meetings; races=$kept; updatedAt=$updatedAt
}
$calJson = ConvertTo-Json -InputObject $calObj -Depth 12
[System.IO.File]::WriteAllText($calPath, $calJson, $utf8)
[System.IO.File]::WriteAllText((Join-Path $root 'data\calendar\real-calendar.json'), $calJson, $utf8)

$racePath = Join-Path $root 'data\race\races.json'
if (Test-Path $racePath) {
  try {
    $rj = [System.IO.File]::ReadAllText($racePath, [System.Text.Encoding]::UTF8) | ConvertFrom-Json
    $rk = New-Object System.Collections.ArrayList
    foreach ($cr in @($rj.races)) {
      if ($cr.date -ne '2026-08-01' -and $cr.date -ne '2026-08-02') { [void]$rk.Add($cr) }
    }
    foreach ($r in ($allListRaces | Sort-Object date, venueId, number)) { [void]$rk.Add($r) }
    $rj2 = @{ version='10.10.0'; source='real'; updatedAt=$updatedAt; races=$rk }
    [System.IO.File]::WriteAllText($racePath, (ConvertTo-Json -InputObject $rj2 -Depth 12), $utf8)
  } catch {}
}

Write-Output ('DONE ok=' + $ok + ' fail=' + $fail + ' entryRaces=' + $entryRaces.Count + ' calRaces=' + $kept.Count)
Write-Output ('entries_bytes=' + (Get-Item (Join-Path $root 'data\horse\entries.json')).Length)
Write-Output ('odds_bytes=' + (Get-Item (Join-Path $root 'data\odds\odds.json')).Length)
