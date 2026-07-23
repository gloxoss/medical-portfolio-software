param(
    [Parameter(Mandatory = $true)]
    [string]$Topic,

    [Parameter(Mandatory = $true)]
    [string]$SourcePath,

    [string]$OutputRoot = "medicore-his/apps/web/src/app/(ops)/learn",
    [string]$DocsRoot = "medicore-his/docs/reports/learning-courses",
    [string]$Summary = "Learning module generated from a code audit checkpoint.",
    [string]$DataFlow = "Document request path, transformations, and outputs.",

    [string[]]$KeyConcepts = @(
        "Entry points",
        "Core logic",
        "Dependencies",
        "Edge cases"
    ),

    [string[]]$ProblemHotspots = @(
        "Validation boundaries",
        "Authorization checks",
        "Tenant scoping",
        "Error handling"
    ),

    [string[]]$FixSuggestions = @(
        "Add focused tests for critical branches",
        "Extract one pure helper to reduce nesting",
        "Add explicit guard clauses for invalid states"
    )
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Convert-ToSlug {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Value
    )

    $normalized = $Value.ToLowerInvariant()
    $normalized = [regex]::Replace($normalized, "[^a-z0-9]+", "-")
    $normalized = [regex]::Replace($normalized, "^-+|-+$", "")

    if ([string]::IsNullOrWhiteSpace($normalized)) {
        throw "Topic '$Value' could not be converted to a valid slug."
    }

    return $normalized
}

$slug = Convert-ToSlug -Value $Topic
$courseDir = Join-Path -Path $OutputRoot -ChildPath $slug
$courseFilePath = Join-Path -Path $courseDir -ChildPath "page.tsx"
$docDir = $DocsRoot
$docFilePath = Join-Path -Path $docDir -ChildPath "$slug.md"

New-Item -ItemType Directory -Force -Path $courseDir | Out-Null
New-Item -ItemType Directory -Force -Path $docDir | Out-Null

$moduleData = @{
    topic = $Topic
    sourcePath = $SourcePath
    generatedAt = (Get-Date).ToString("yyyy-MM-dd HH:mm")
    summary = $Summary
    dataFlow = $DataFlow
    keyConcepts = $KeyConcepts
    problemHotspots = $ProblemHotspots
    fixSuggestions = $FixSuggestions
}

$moduleDataJson = $moduleData | ConvertTo-Json -Depth 6

$pageContent = @"
const moduleData = $moduleDataJson as const;

export default function LearningCoursePage() {
  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
          Code Learning Course
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">{moduleData.topic}</h1>
        <p className="text-sm text-slate-500">Source: {moduleData.sourcePath}</p>
        <p className="text-sm text-slate-500">Generated: {moduleData.generatedAt}</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Summary</h2>
        <p className="mt-3 text-slate-700">{moduleData.summary}</p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Data Flow</h2>
        <p className="mt-3 text-slate-700">{moduleData.dataFlow}</p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Key Concepts</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700">
            {moduleData.keyConcepts.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Problem Hotspots</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700">
            {moduleData.problemHotspots.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Fix Suggestions</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-slate-700">
          {moduleData.fixSuggestions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>
    </main>
  );
}
"@

$docLines = @(
    "# $Topic",
    "",
    "## Summary",
    $Summary,
    "",
    "## Source Scope",
    "- Source path: $SourcePath",
    "- Generated at: $($moduleData.generatedAt)",
    "",
    "## Data Flow",
    $DataFlow,
    "",
    "## Key Concepts"
)

foreach ($item in $KeyConcepts) {
    $docLines += "- $item"
}

$docLines += ""
$docLines += "## Problem Hotspots"

foreach ($item in $ProblemHotspots) {
    $docLines += "- $item"
}

$docLines += ""
$docLines += "## Fix Suggestions"

$index = 1
foreach ($item in $FixSuggestions) {
    $docLines += "$index. $item"
    $index++
}

$docLines += ""
$docLines += "## Review Questions"
$docLines += "- What inputs enter this module and where are they validated?"
$docLines += "- Where is auth and tenant scope enforced?"
$docLines += "- What would fail first if one dependency changed?"

Set-Content -Path $courseFilePath -Value $pageContent -Encoding UTF8
Set-Content -Path $docFilePath -Value ($docLines -join [Environment]::NewLine) -Encoding UTF8

Write-Output "Created React learning page: $courseFilePath"
Write-Output "Created lesson document: $docFilePath"
