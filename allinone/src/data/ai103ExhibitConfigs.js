// Shared exhibit data for AI-103 questions whose PDF answer areas are
// tables, code snippets, or label+dropdown hotspots. Used by both the
// read-only study page (AI103.jsx) and the practice runner (AI103Practice.jsx)
// so the extracted text stays in one place instead of two.

// Multiple-choice questions whose exhibit is a table or code snippet
// (question 9's agent table, question 14's code snippet).
export const multipleChoiceExhibitConfigs = {
  14: {
    exhibitTitle: 'Code Snippet',
    exhibitPageLabel: 'PDF page 21',
    exhibitInsertAfterParagraph: 3,
    exhibitCode: 'run = project_client.agents.runs.create_and_process(\n    thread_id=thread.id,\n    agent_id=agent.id\n)',
  },
  9: {
    exhibitTitle: 'Exhibit',
    exhibitPageLabel: 'PDF page 16',
    exhibitInsertAfterParagraph: 1,
    exhibitTable: {
      headers: ['Name', 'Description'],
      rows: [
        ['TriageAgent', 'Classifies incoming customer requests'],
        ['PolicyAgent', 'Answers policy questions by searching internal content'],
        ['ActionAgent', 'Creates or updates tickets by calling an HTTP API'],
      ],
    },
  },
};

// HOTSPOT questions whose answer area is a code block with dropdown blanks
// (question 35) or label+dropdown fields (question 40).
export const visualCodeHotspotConfigs = {
  35: {
    codeTemplate:
      'message = client.messages.create(\n' +
      '    model="deployment-name",\n' +
      '    messages=[\n' +
      '        {"role": "user", "content": "Summarize the release notes in 3 bullet points."}\n' +
      '    ],\n' +
      '    max_tokens=800,\n' +
      '    temperature={{temperature}},\n' +
      '    thinking={"type": "enabled"},\n' +
      '    output_config={"effort": {{effort}}}\n' +
      ')',
    codeBlanks: {
      temperature: { options: ['0', '1', '2'], answer: '1' },
      effort: { options: ['"high"', '"low"', '"medium"'], answer: '"low"' },
    },
  },
  40: {
    hotspotFields: [
      {
        label: 'Authentication method:',
        options: [
          'A personal access token (PAT)',
          'A user-assigned managed identity',
          'An Azure Login action that uses OpenID Connect (OIDC)',
        ],
        answer: 'An Azure Login action that uses OpenID Connect (OIDC)',
      },
      {
        label: 'If the evaluation results are NOT met, configure the workflow to:',
        options: ['Lock the target branch', 'Send an alert', 'Fail'],
        answer: 'Fail',
      },
    ],
  },
};
