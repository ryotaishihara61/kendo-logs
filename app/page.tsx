// app/page.tsx
import { Client } from '@notionhq/client';
import KendoList from '@/components/KendoList';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID!;

export default async function Home() {
  let allPages: any[] = [];
  let hasMore = true;
  let cursor: string | undefined = undefined;

  // 117件以上の全データをページングして取得
  while (hasMore) {
    const response = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    });
    allPages = [...allPages, ...response.results];
    hasMore = response.has_more;
    cursor = response.next_cursor || undefined;
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-16 text-center">
          <h1 className="text-6xl font-black mb-4 tracking-tighter italic text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-400">
            KENDO LOG
          </h1>
          <p className="text-gray-500 font-mono tracking-[0.3em] uppercase text-xs">Technical Archive & Wisdom</p>
        </header>

        <KendoList logs={allPages} />
      </div>
    </main>
  );
}