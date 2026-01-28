import { Client } from '@notionhq/client';
import { NextResponse } from 'next/server';

const notion = new Client({ auth: process.env.NOTION_API_KEY });

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pageId = searchParams.get('pageId');

  if (!pageId) return NextResponse.json({ error: 'Page ID required' }, { status: 400 });

  try {
    const blocks = await notion.blocks.children.list({ block_id: pageId });
    const content = blocks.results.map((block: any) => {
      const type = block.type;
      const textContent = block[type]?.rich_text;
      const text = Array.isArray(textContent) ? textContent.map((t: any) => t.plain_text).join('') : '';

      // ブロックタイプに応じてマークダウン形式に変換
      switch (type) {
        case 'bulleted_list_item':
          return `- ${text}`;
        case 'numbered_list_item':
          return `1. ${text}`;
        case 'heading_1':
          return `# ${text}`;
        case 'heading_2':
          return `## ${text}`;
        case 'heading_3':
          return `### ${text}`;
        case 'code':
          return `\`\`\`\n${text}\n\`\`\``;
        default:
          return text;
      }
    }).join('\n\n');

    return NextResponse.json({ content });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}