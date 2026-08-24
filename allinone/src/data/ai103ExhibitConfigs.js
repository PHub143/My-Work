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
  133: {
    answerRows: [
      { label: 'Step 1', value: 'Provision an on-premises Kubernetes cluster that has internet connectivity.' },
      { label: 'Step 2', value: 'Pull an image from the Microsoft Container Registry (MCR).' },
      { label: 'Step 3', value: 'Run the container and specify an API key and the Endpoint URL of the Azure AI resource.' },
    ],
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
  118: {
    hotspotFields: [
      {
        label: 'Project Types:',
        options: ['Classification', 'Object Detection'],
        answer: 'Classification',
      },
      {
        label: 'Classification Types:',
        options: ['Multiclass (Single tag per image)', 'Multilabel (Multiple tags per image)'],
        answer: 'Multiclass (Single tag per image)',
      },
      {
        label: 'Domains:',
        options: [
          'Adult',
          'Food',
          'General',
          'General (compact)',
          'Landmarks',
          'Landmarks (compact)',
          'Retail',
          'Retail (compact)',
        ],
        answer: 'General (compact)',
      },
    ],
  },
  77: {
    codeTemplate:
      'from azure.ai.projects.models import MemorySearchTool, PromptAgentDefinition\n\n' +
      'mem_store_name = "agent_mem_store"\n' +
      'memory_tool = MemorySearchTool(\n' +
      '    memory_store_name=mem_store_name,\n' +
      '    scope={{scope}},\n' +
      ')\n' +
      'agent_def = PromptAgentDefinition(\n' +
      '    model="gpt-5.2",\n' +
      '    instructions="You are a customer support assistant.",\n' +
      '    tools={{tools}},\n' +
      ')',
    codeBlanks: {
      scope: {
        options: [
          '"session"',
          '"{{$conversationId}}"',
          '"{{$userId}}"',
          '[mem_store_name]',
          '[memory_tool]',
          'MemorySearchTool("support_mem_store")',
        ],
        answer: '"{{$userId}}"',
      },
      tools: {
        options: [
          '"session"',
          '"{{$conversationId}}"',
          '"{{$userId}}"',
          '[mem_store_name]',
          '[memory_tool]',
          'MemorySearchTool("support_mem_store")',
        ],
        answer: '[memory_tool]',
      },
    },
  },
};
