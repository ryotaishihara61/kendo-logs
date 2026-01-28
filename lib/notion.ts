import { Client } from '@notionhq/client';
import { NextResponse } from 'next/server';

const notion = new Client({ auth: process.env.NOTION_API_KEY });

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pageId = searchParams.get('pageId');
  const query = searchParams.get('query');

  try {
    if (pageId) {
      // (本文取得の処理はそのまま...)
      const blocks = await notion.blocks.children.list({ block_id: pageId });
      const content = blocks.results.map((block: any) => {
        if (block.type === 'paragraph') return block.paragraph.rich_text.map((t: any) => t.plain_text).join('') + '\n\n';
        if (block.type === 'bulleted_list_item') return '- ' + block.bulleted_list_item.rich_text.map((t: any) => t.plain_text).join('') + '\n';
        return '';
      }).join('');
      return NextResponse.json({ content });
    }

    if (query) {
      const lowerQuery = query.toLowerCase();
      const pages = await notion.databases.query({ 
        database_id: process.env.NOTION_DATABASE_ID!,
        sorts: [{ property: 'Date', direction: 'descending' }]
      });
      
      const matchedPages = [];

      for (const page of pages.results) {
        // 1. タイトルを抽出してチェック
        const title = (page as any).properties.Title?.title[0]?.plain_text || "";
        if (title.toLowerCase().includes(lowerQuery)) {
          matchedPages.push(page);
          continue; 
        }

        // 2. 本文から「テキストのみ」を抽出してチェック（ノイズを除去）
        const blocks = await notion.blocks.children.list({ block_id: page.id });
        const visibleText = blocks.results.map((block: any) => {
          // 各ブロック（段落、リスト等）の rich_text の中身だけを結合
          const textContent = block[block.type]?.rich_text;
          return Array.isArray(textContent) 
            ? textContent.map((t: any) => t.plain_text).join('') 
            : '';
        }).join(' ').toLowerCase();

        if (visibleText.includes(lowerQuery)) {
          matchedPages.push(page);
        }
      }
      return NextResponse.json({ results: matchedPages });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Notion API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}