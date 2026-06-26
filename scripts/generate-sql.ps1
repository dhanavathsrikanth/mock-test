$csvPath = "C:\Users\ratho\OneDrive\Desktop\mocktest\questions_dataset.csv"
$outputPath = "C:\Users\ratho\OneDrive\Desktop\mocktest\scripts\insert-questions.sql"

$subjectMap = @{
    "surveying"         = "3f275622-18e3-40ce-a134-ec660b48190c"
    "building-materials" = "a3efd61d-542a-4076-8ffe-631b227f0239"
    "som"               = "dd2eab18-a6c2-4636-a005-1f9ea9aef419"
    "rcc"               = "e7eaeaa0-d839-4490-abed-c71027b61424"
    "hydraulics"        = "a8556419-0986-4502-80b2-78b7defb8990"
    "estimation"        = "aee3c24f-8b41-461f-8e64-e9544a04c1b6"
    "hydrology"         = "64289b52-861b-4a49-9286-4c4196691af7"
    "environmental"     = "c542f294-548d-4129-8d45-b3f75629dc1b"
    "transportation"    = "637bf719-8dde-4035-946c-4242372328e2"
    "soil-mechanics"    = "c39bc91d-4a88-42c6-b1f7-ae4fc2b0dba1"
}

$examId = "e33338c9-740c-48c4-914b-2cca3e9c1668"

$rows = Import-Csv -LiteralPath $csvPath

$valueTuples = foreach ($row in $rows) {
    $year = if ([string]::IsNullOrWhiteSpace($row.year)) { "NULL" } else { [int]::Parse($row.year) }
    $paper = if ([string]::IsNullOrWhiteSpace($row.paper)) { "NULL" } else { "'$($row.paper.Replace("'","''"))'" }
    $subjectId = $subjectMap[$row.subject_slug]
    
    $questionText = "'$($row.question_text.Replace("'","''"))'"
    $option1 = "'$($row.option_1.Replace("'","''"))'"
    $option2 = "'$($row.option_2.Replace("'","''"))'"
    $option3 = "'$($row.option_3.Replace("'","''"))'"
    $option4 = "'$($row.option_4.Replace("'","''"))'"
    
    $correctOption = [int]::Parse($row.correct_option)
    
    $explanation = if ([string]::IsNullOrWhiteSpace($row.explanation) -or $row.explanation -eq "N/A") { "NULL" } else { "'$($row.explanation.Replace("'","''"))'" }
    
    $difficulty = if ($row.difficulty -in @("easy","medium","hard")) { "'$($row.difficulty)'" } else { "NULL" }
    
    "('$examId', '$subjectId', $year, $paper, $questionText, $option1, $option2, $option3, $option4, $correctOption, $explanation, $difficulty)"
}

$header = "INSERT INTO questions (exam_id, subject_id, year, paper, question_text, option_1, option_2, option_3, option_4, correct_option, explanation, difficulty) VALUES"
$body = ($valueTuples -join ",`n") + ";"

$sql = $header + "`n" + $body

Set-Content -LiteralPath $outputPath -Value $sql -Encoding UTF8

Write-Host "SQL file generated at: $outputPath"
Write-Host "Total questions processed: $($valueTuples.Count)"
