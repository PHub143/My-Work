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
  121: {
    exhibitCode:
      'from azure.core.credentials import AzureKeyCredential\n' +
      'from azure.ai.textanalytics import TextAnalyticsClient\n\n' +
      'endpoint = os.environ["AZURE_TEXT_ANALYTICS_ENDPOINT"]\n' +
      'key = os.environ["AZURE_TEXT_ANALYTICS_KEY"]\n\n' +
      'text_analytics_client = TextAnalyticsClient(endpoint=endpoint, credential=AzureKeyCredential(key))\n' +
      'documents = [\n' +
      '    """\n' +
      '    Our tour guide took us up the Space Needle during our trip to Seattle last week.\n' +
      '    """\n' +
      ']\n\n' +
      'result = text_analytics_client.recognize_linked_entities(documents)',
    hotspotFields: [
      {
        label: 'The code will detect the language of documents.',
        options: ['Yes', 'No'],
        answer: 'Yes',
      },
      {
        label: 'The url attribute returned for each linked entity will be a Bing search link.',
        options: ['Yes', 'No'],
        answer: 'Yes',
      },
      {
        label: 'The matches attribute returned for each linked entity will provide the location in a document where the entity is referenced.',
        options: ['Yes', 'No'],
        answer: 'No',
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
  122: {
    hotspotFields: [
      {
        label: 'Model evaluation',
        options: [
          'Configure private endpoint access.',
          'Use deployment lists and license tabs.',
          'Use tool catalog connections and run traces.',
          'Use model catalog leaderboards and model cards.',
        ],
        answer: 'Use model catalog leaderboards and model cards.',
      },
      {
        label: 'Deployment option',
        options: [
          'Bring your own model.',
          'Build a vector index.',
          'Use a serverless deployment.',
          'Use a managed compute deployment.',
        ],
        answer: 'Use a serverless deployment.',
      },
    ],
  },
  124: {
    exhibitCode:
      '...\n' +
      'openai.api_key = key\n' +
      'openai.api_base = endpoint\n' +
      'response = openai.ChatCompletion.create(\n' +
      '    engine=deployment_name\n' +
      '    messages=[\n' +
      '        {"role": "system", "content": "You are a helpful assistant."},\n' +
      '        {"role": "user", "content": "What is an LLM?"}\n' +
      '    ]\n' +
      ')\n\n' +
      "print(response['choices'][0]['message']['content'])\n" +
      '...',
    hotspotFields: [
      {
        label: 'The response will contain an explanation of large language models (LLMs) that has a high degree of certainty.',
        options: ['Yes', 'No'],
        answer: 'Yes',
      },
      {
        label: 'Changing "What is an LLM?" to "What is an LLM in the context of AI models?" will produce the intended response.',
        options: ['Yes', 'No'],
        answer: 'Yes',
      },
      {
        label: 'Changing "You are a helpful assistant." to "You must answer only within the context of AI language models." will give a higher likelihood of producing the intended response.',
        options: ['Yes', 'No'],
        answer: 'No',
      },
    ],
  },
  128: {
    hotspotFields: [
      {
        label: 'Extract text',
        options: ['Azure AI Search', 'Azure Vision in Foundry Tools', 'Azure Document Intelligence in Foundry Tools'],
        answer: 'Azure Document Intelligence in Foundry Tools',
      },
      {
        label: 'Perform sentiment analysis',
        options: [
          'Azure AI Search',
          'Azure AI Computer Vision',
          'Azure Document Intelligence in Foundry Tools',
          'Azure Language in Foundry Tools',
        ],
        answer: 'Azure Language in Foundry Tools',
      },
    ],
  },
  130: {
    exhibitCode:
      'docker run --rm -it -p 5000:5000 --memory 10g --cpus 2 \\\n' +
      'mcr.microsoft.com/azure-cognitive-services/textanalytics/sentiment \\\n' +
      'Eula=accept \\\n' +
      'Billing={ENDPOINT_URI} \\\n' +
      'ApiKey={API_KEY}',
    hotspotFields: [
      {
        label: 'Going to http://localhost:5000/status will query the Azure endpoint to verify whether the API key used to start the container is valid.',
        options: ['Yes', 'No'],
        answer: 'Yes',
      },
      {
        label: 'The container logging provider will write log data.',
        options: ['Yes', 'No'],
        answer: 'No',
      },
      {
        label: 'Going to http://localhost:5000/swagger will provide the details to access the documentation for the available endpoints.',
        options: ['Yes', 'No'],
        answer: 'Yes',
      },
    ],
  },
  134: {
    exhibitCode: '"https://*.cognitiveservices.azure.com/vision/v3.2/analyze?visualFeatures={value}&details={string}&language=e...',
    hotspotFields: [
      {
        label: 'HTTP method',
        options: ['GET', 'PATCH', 'POST'],
        answer: 'GET',
      },
      {
        label: 'visualFeatures value',
        options: ['description', 'imageType', 'objects', 'tags'],
        answer: 'imageType',
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
