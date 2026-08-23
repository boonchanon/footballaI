$path = "D:\bundesliga-clubs-display (1)\app\ai-prediction\page.tsx"
$content = Get-Content -Raw -Path $path

$content = [regex]::Replace($content, 'function getStatusLabel\(fixture: Fixture\) \{[\s\S]*?\n\}', @'
function getStatusLabel(fixture: Fixture) {
  if (fixture.status.isFinished) return "Finished"
  if (fixture.status.isLive) return fixture.status.short ? `${fixture.status.short}'` : "Live"
  return "Upcoming"
}
'@)

$content = [regex]::Replace($content, 'function getWeekLabel\(week: number\) \{[\s\S]*?\n\}', @'
function getWeekLabel(week: number) {
  return `Matchweek ${week}`
}
'@)

$content = [regex]::Replace($content, 'throw new Error\([\s\S]*?\)', 'throw new Error("Failed to load prediction file")')

$content = [regex]::Replace($content, '<h1 className="text-4xl font-display leading-tight text-white md:text-6xl">[\s\S]*?</h1>', @'
<h1 className="text-4xl font-display leading-tight text-white md:text-6xl">
                Premier League Prediction Board
                <span className="block text-primary">Reveal each match prediction on demand</span>
              </h1>
'@)

$content = [regex]::Replace($content, '<p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">[\s\S]*?</p>', @'
<p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
                Browse the full season by matchweek, select a fixture, then reveal the model output only when you want to see it.
              </p>
'@, 1)

$replacements = @{
  'à¸ªà¸±à¸›à¸”à¸²à¸«à¹Œà¸—à¸µà¹ˆà¸žà¸£à¹‰à¸­à¸¡à¹à¸ªà¸”à¸‡' = 'Available matchweeks'
  'à¸„à¸¹à¹ˆà¸—à¸µà¹ˆà¸”à¸¶à¸‡à¸ˆà¸²à¸à¸£à¸°à¸šà¸šà¹à¸‚à¹ˆà¸‡' = 'Loaded from fixture service'
  'à¸„à¸¹à¹ˆà¸—à¸µà¹ˆà¸¡à¸µà¸„à¹ˆà¸² model à¸„à¸£à¸š' = 'Matched CSV predictions'
  'à¸à¸³à¸¥à¸±à¸‡à¹‚à¸«à¸¥à¸” prediction board...' = 'Loading prediction board...'
  'à¹‚à¸«à¸¥à¸”à¸«à¸™à¹‰à¸² prediction à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ' = 'Failed to load prediction board'
  'à¹€à¸¥à¸·à¸­à¸à¸ªà¸±à¸›à¸”à¸²à¸«à¹Œà¸à¸²à¸£à¹à¸‚à¹ˆà¸‡à¸‚à¸±à¸™' = 'Choose a matchweek'
  'à¸à¸”à¸ªà¸±à¸›à¸”à¸²à¸«à¹Œà¹€à¸žà¸·à¹ˆà¸­à¸ªà¸¥à¸±à¸šà¸£à¸²à¸¢à¸à¸²à¸£à¸„à¸¹à¹ˆà¹à¸‚à¹ˆà¸‡à¸‚à¸±à¸™ à¹à¸¥à¹‰à¸§à¸„à¹ˆà¸­à¸¢à¹€à¸›à¸´à¸”à¸œà¸¥à¸—à¸³à¸™à¸²à¸¢à¸‚à¸­à¸‡à¸„à¸¹à¹ˆà¸—à¸µà¹ˆà¸ªà¸™à¹ƒà¸ˆ' = 'Switch weeks on the left, then pick a fixture and reveal its prediction.'
  'à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¡à¸µà¸‚à¹‰à¸­à¸¡à¸¹à¸¥' = 'No data'
  'à¸£à¸²à¸¢à¸à¸²à¸£à¹à¸¡à¸•à¸Šà¹Œ' = 'Fixtures'
  'à¹€à¸¥à¸·à¸­à¸à¹à¸¡à¸•à¸Šà¹Œà¸ˆà¸²à¸à¸à¸±à¹ˆà¸‡à¸‹à¹‰à¸²à¸¢ à¹à¸¥à¹‰à¸§à¸”à¸¹à¸œà¸¥à¸—à¸³à¸™à¸²à¸¢à¸—à¸²à¸‡à¸à¸±à¹ˆà¸‡à¸‚à¸§à¸²' = 'Select a fixture on the left to inspect the prediction panel.'
  'à¹€à¸›à¸´à¸”à¸œà¸¥à¹à¸¥à¹‰à¸§' = 'Prediction revealed'
  'à¸à¸”à¸”à¸¹à¸œà¸¥à¹„à¸”à¹‰' = 'Ready to reveal'
  'à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸ˆà¸±à¸š prediction' = 'No matched prediction'
  'à¸œà¸¥à¸—à¸³à¸™à¸²à¸¢à¸‚à¸­à¸‡à¸„à¸¹à¹ˆà¸™à¸µà¹‰' = 'Prediction'
  'à¸‹à¹ˆà¸­à¸™à¸œà¸¥à¸—à¸³à¸™à¸²à¸¢' = 'Hide prediction'
  'à¸”à¸¹à¸œà¸¥à¸—à¸³à¸™à¸²à¸¢' = 'Reveal prediction'
  'à¸„à¸³à¸•à¸­à¸šà¸«à¸¥à¸±à¸' = 'Primary output'
  'à¸„à¸§à¸²à¸¡à¸¡à¸±à¹ˆà¸™à¹ƒà¸ˆ' = 'Confidence'
  'à¸œà¸¥à¸—à¸³à¸™à¸²à¸¢' = 'Predicted result'
  'à¸à¸”à¸”à¸¹à¸œà¸¥à¸à¹ˆà¸­à¸™' = 'Reveal the prediction first'
  'à¹€à¸¡à¸·à¹ˆà¸­à¸à¸”à¸›à¸¸à¹ˆà¸¡ à¸£à¸°à¸šà¸šà¸ˆà¸°à¹‚à¸Šà¸§à¹Œ Predicted score, à¸„à¹ˆà¸²à¸„à¸§à¸²à¸¡à¸¡à¸±à¹ˆà¸™à¹ƒà¸ˆ à¹à¸¥à¸° supporting model views à¸‚à¸­à¸‡à¸„à¸¹à¹ˆà¸™à¸µà¹‰' = 'This panel will show the predicted score, confidence, probabilities, and model breakdown after you click the button.'
  'à¸„à¸¹à¹ˆà¸™à¸µà¹‰à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸ˆà¸±à¸šà¸à¸±à¸š prediction à¹ƒà¸™à¹„à¸Ÿà¸¥à¹Œ' = 'No matched prediction for this fixture'
  'à¸¡à¸±à¸à¹€à¸à¸´à¸”à¸ˆà¸²à¸à¸Šà¸·à¹ˆà¸­à¸—à¸µà¸¡à¹ƒà¸™ fixture à¸à¸±à¸š CSV à¹„à¸¡à¹ˆà¸•à¸£à¸‡à¸à¸±à¸™à¹€à¸›à¹Šà¸° à¸–à¹‰à¸²à¸•à¹‰à¸­à¸‡à¸à¸²à¸£à¸œà¸¡à¹„à¸¥à¹ˆà¹€à¸žà¸´à¹ˆà¸¡ alias à¹ƒà¸«à¹‰à¸ˆà¸±à¸šà¸„à¸£à¸šà¸‚à¸¶à¹‰à¸™à¹„à¸”à¹‰à¸•à¹ˆà¸­' = 'This usually means the fixture team names do not exactly match the CSV names yet.'
  'à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¡à¸µà¹à¸¡à¸•à¸Šà¹Œà¹ƒà¸«à¹‰à¹à¸ªà¸”à¸‡' = 'No fixture selected'
  'à¹€à¸¡à¸·à¹ˆà¸­ fixture à¹à¸¥à¸° prediction à¸–à¸¹à¸à¹‚à¸«à¸¥à¸”à¸„à¸£à¸šà¹à¸¥à¹‰à¸§ à¸ˆà¸°à¸ªà¸²à¸¡à¸²à¸£à¸–à¹€à¸¥à¸·à¸­à¸à¹à¸¡à¸•à¸Šà¹Œà¹à¸¥à¸°à¸”à¸¹à¸œà¸¥à¸—à¸³à¸™à¸²à¸¢à¹„à¸”à¹‰à¸ˆà¸²à¸à¸•à¸£à¸‡à¸™à¸µà¹‰' = 'When fixtures and predictions are loaded, you can pick any match and inspect its prediction here.'
  'Ã¢â‚¬Â¢' = '|'
  'à¹à¸¡à¸•à¸Šà¹Œ' = 'matches'
  'à¸„à¸¹à¹ˆ' = 'fixtures'
}

foreach ($key in $replacements.Keys) {
  $content = $content.Replace($key, $replacements[$key])
}

[System.IO.File]::WriteAllText($path, $content, [System.Text.UTF8Encoding]::new($false))
