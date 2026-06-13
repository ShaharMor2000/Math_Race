$ErrorActionPreference = "Stop"
$base = "http://localhost:8080/api/v1"
$passed = 0
$failed = 0

function Pass($name) { Write-Host "PASS: $name" -ForegroundColor Green; $script:passed++ }
function Fail($name, $detail) { Write-Host "FAIL: $name - $detail" -ForegroundColor Red; $script:failed++ }

try {
  $login = Invoke-RestMethod -Uri "$base/auth/teacher/login" -Method Post -ContentType "application/json" -Body '{"email":"teacher@test.com","password":"teacher123"}'
  if (-not $login.accessToken) { throw "No token" }
  $headers = @{ Authorization = "Bearer $($login.accessToken)" }
  Pass "Teacher login"
} catch { Fail "Teacher login" $_.Exception.Message }

try {
  $null = Invoke-RestMethod -Uri "$base/teacher/races" -Headers $headers
  Pass "List teacher races"
} catch { Fail "List teacher races" $_.Exception.Message }

try {
  $room = Invoke-RestMethod -Uri "$base/teacher/races/ADBD6E" -Headers $headers
  if ($room.roomCode -ne "ADBD6E") { throw "Wrong room code" }
  if ($null -eq $room.participants) { throw "Missing participants" }
  Pass "Room details ADBD6E"
} catch { Fail "Room details ADBD6E" $_.Exception.Message }

try {
  $null = Invoke-RestMethod -Uri "$base/student/races/open" -Method Get
  Pass "Open races list"
} catch { Fail "Open races list" $_.Exception.Message }

try {
  $createBody = '{"title":"API Test","className":"T","maxParticipants":8,"questionTimeMs":15000,"initialDifficulty":"MEDIUM","enableLuckEvents":true,"enablePathChoice":true,"raceDurationMinutes":30}'
  $created = Invoke-RestMethod -Uri "$base/teacher/races" -Method Post -Headers $headers -ContentType "application/json" -Body $createBody
  $testRoom = $created.roomCode

  $email = "tester$((Get-Random))@test.com"
  $joinBody = "{`"roomCode`":`"$testRoom`",`"displayName`":`"Tester`",`"email`":`"$email`"}"
  $join = Invoke-RestMethod -Uri "$base/student/join" -Method Post -ContentType "application/json" -Body $joinBody
  if ($join.participant.participantStatus -ne "PENDING") { throw "Expected PENDING status" }

  $studentHeaders = @{ Authorization = "Bearer $($join.studentToken)" }
  $participantId = $join.participant.participantId
  $null = Invoke-RestMethod -Uri "$base/teacher/races/$testRoom/participants/$participantId/approve" -Method Post -Headers $headers

  $detail = Invoke-RestMethod -Uri "$base/teacher/races/$testRoom" -Headers $headers
  if ($detail.status -notin @("LOBBY","LOCKED")) { throw "Unexpected pre-start status" }

  $null = Invoke-RestMethod -Uri "$base/teacher/races/$testRoom/start" -Method Post -Headers $headers
  $detail2 = Invoke-RestMethod -Uri "$base/teacher/races/$testRoom" -Headers $headers
  if ($detail2.status -ne "RUNNING") { throw "Race not RUNNING after start" }
  Pass "Create race + start (status=RUNNING)"

  $q = Invoke-RestMethod -Uri "$base/student/races/$testRoom/question" -Headers $studentHeaders
  if (-not $q.questionId) { throw "No question returned" }
  Pass "Student gets question"

  $ansBody = "{`"questionId`":$($q.questionId),`"submittedAnswer`":`"$($q.options[0])`",`"responseTimeMs`":3000}"
  $ans = Invoke-RestMethod -Uri "$base/student/races/$testRoom/answer" -Method Post -Headers $studentHeaders -ContentType "application/json" -Body $ansBody
  if ($null -eq $ans.newProgress) { throw "No progress after answer" }
  Pass "Submit answer"

  $lb = Invoke-RestMethod -Uri "$base/teacher/races/$testRoom/leaderboard" -Headers $headers
  if ($lb.Count -lt 1) { throw "Leaderboard empty" }
  Pass "Leaderboard after answer"

  $null = Invoke-RestMethod -Uri "$base/teacher/races/$testRoom/pause" -Method Post -Headers $headers
  $paused = Invoke-RestMethod -Uri "$base/teacher/races/$testRoom" -Headers $headers
  if ($paused.status -ne "PAUSED") { throw "Pause failed" }
  Pass "Pause race"

  $null = Invoke-RestMethod -Uri "$base/teacher/races/$testRoom/resume" -Method Post -Headers $headers
  $resumed = Invoke-RestMethod -Uri "$base/teacher/races/$testRoom" -Headers $headers
  if ($resumed.status -ne "RUNNING") { throw "Resume failed" }
  Pass "Resume race"

  $null = Invoke-RestMethod -Uri "$base/teacher/races/$testRoom/end" -Method Post -Headers $headers
  $finished = Invoke-RestMethod -Uri "$base/teacher/races/$testRoom" -Headers $headers
  if ($finished.status -ne "FINISHED") { throw "End race failed" }
  Pass "End race"

  $results = Invoke-RestMethod -Uri "$base/teacher/races/$testRoom/results" -Headers $headers
  if ($results.leaderboard.Count -lt 1) { throw "No final results" }
  Pass "Final results"
} catch {
  Fail "Full race flow" $_.Exception.Message
}

Write-Host ""
Write-Host "Passed: $passed | Failed: $failed"
if ($failed -gt 0) { exit 1 }
