'use client';

import { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function KendoList({ logs }: { logs: any[] }) {
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [fullData, setFullData] = useState<Record<string, string>>({}); 
  const [isPreloading, setIsPreloading] = useState(true);

  // --- 1. 全本文を一括キャッシュ（爆速検索） ---
  useEffect(() => {
    const preload = async () => {
      const cache: Record<string, string> = {};
      const promises = logs.map(async (log) => {
        try {
          const res = await fetch(`/api/notion?pageId=${log.id}`);
          const data = await res.json();
          cache[log.id] = data.content || '';
        } catch (e) { cache[log.id] = ''; }
      });
      await Promise.all(promises);
      setFullData(cache);
      setIsPreloading(false);
    };
    preload();
  }, [logs]);

  // --- 2. 年月リスト作成（新しい順）+ 記事数カウント ---
  const monthOptions = useMemo(() => {
    const monthCounts: Record<string, number> = {};
    logs.forEach(log => {
      const date = log.properties.Date?.date?.start;
      if (date) {
        const month = date.substring(0, 7);
        monthCounts[month] = (monthCounts[month] || 0) + 1;
      }
    });
    return Object.entries(monthCounts)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [logs]);

  // --- 3. フィルタリング & 並び替え（新しい順） ---
  const filteredLogs = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase();
    const filtered = logs.filter((log) => {
      const date = log.properties.Date?.date?.start || '';
      const title = log.properties.Title?.title[0]?.plain_text?.toLowerCase() || '';
      const body = (fullData[log.id] || '').toLowerCase();
      const matchesSearch = title.includes(lowerQuery) || body.includes(lowerQuery);
      const matchesMonth = selectedMonth === 'all' || date.startsWith(selectedMonth);
      return matchesSearch && matchesMonth;
    });
    return filtered.sort((a, b) => {
      const dateA = a.properties.Date?.date?.start || '';
      const dateB = b.properties.Date?.date?.start || '';
      return dateB.localeCompare(dateA);
    });
  }, [searchQuery, selectedMonth, logs, fullData]);

  const getYouTubeThumbnail = (url: string) => {
    const videoId = url?.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/)?.[1];
    return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;
  };

  return (
    <>
      {/* 検索・フィルターエリア */}
      <div className="mb-12 max-w-4xl mx-auto flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder={isPreloading ? "データを同期しています..." : "全ログから本文検索..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={isPreloading}
            className="w-full bg-gray-900 border-2 border-gray-700 rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
          />
          {isPreloading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          )}
        </div>
        
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="bg-gray-900 border-2 border-gray-700 text-gray-300 rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all min-w-[200px]"
        >
          <option value="all">すべての期間（{logs.length}）</option>
          {monthOptions.map(({ month, count }) => (
            <option key={month} value={month}>
              {month.replace('-', '年')}月（{count}）
            </option>
          ))}
        </select>
      </div>

      <p className="text-center text-gray-500 text-xs mb-8 font-mono uppercase tracking-widest">
        Showing {filteredLogs.length} of {logs.length} Training Sessions
      </p>

      {/* ログ一覧（リスト形式） */}
      <div className="max-w-5xl mx-auto space-y-4">
        {filteredLogs.map((log) => (
          <div
            key={log.id}
            onClick={() => setSelectedLog(log)}
            className="group bg-gray-800/40 rounded-xl border border-gray-700 hover:border-blue-500 cursor-pointer overflow-hidden transition-all shadow-lg shadow-black flex flex-col md:flex-row hover:bg-gray-800/60"
          >
            {/* 左側: サムネイル（スマホでは上、PCでは左） */}
            <div className="w-full md:w-64 md:flex-shrink-0 bg-gray-900 relative aspect-video md:aspect-auto md:h-40">
              {getYouTubeThumbnail(log.properties.YouTube?.url) ? (
                <img
                  src={getYouTubeThumbnail(log.properties.YouTube.url)!}
                  className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-all duration-500"
                  alt="YouTube thumbnail"
                />
              ) : (
                <img
                  src="/no-video.png"
                  className="w-full h-full object-cover opacity-50"
                  alt="No video available"
                />
              )}
            </div>

            {/* 右側: 情報（スマホでは下、PCでは右） */}
            <div className="flex-1 p-4 md:p-6 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-blue-600/20 border border-blue-500/30 px-3 py-1 rounded-lg text-[11px] font-bold text-blue-400 tracking-wider">
                  {log.properties.Date?.date?.start?.replace(/-/g, '/')}
                </span>
              </div>
              <h2 className="text-lg md:text-xl font-bold text-gray-100 group-hover:text-blue-400 transition-colors leading-snug">
                {log.properties.Title?.title[0]?.plain_text}
              </h2>
            </div>
          </div>
        ))}
      </div>

      {/* 詳細モーダル */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setSelectedLog(null)}>
          <div className="bg-[#0f172a] border border-white/10 w-full max-w-4xl h-[85vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b border-white/5 bg-white/5 flex justify-between items-start">
              <div>
                <p className="text-blue-400 font-mono text-xs mb-1 font-bold">{selectedLog.properties.Date?.date?.start}</p>
                <h2 className="text-2xl font-black text-white tracking-tight">{selectedLog.properties.Title?.title[0]?.plain_text}</h2>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-gray-400 hover:text-white bg-white/5 p-2 rounded-full transition-colors border border-white/10">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 md:p-12">
              {selectedLog.properties.YouTube?.url && (
                <div className="aspect-video mb-12 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                  <iframe 
                    width="100%" height="100%" 
                    src={`https://www.youtube.com/embed/${selectedLog.properties.YouTube.url.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/)?.[1]}`}
                    frameBorder="0" allowFullScreen
                  ></iframe>
                </div>
              )}

              {/* 強制的に丸ポチを出すためのスタイル上書き */}
              <article className="prose prose-invert prose-blue max-w-none [overflow:visible!important]
                [&_ul]:[list-style-type:disc!important] [&_ul]:[list-style-position:outside!important]
                [&_ul]:[padding-left:2rem!important] [&_ul]:[margin-left:0!important]
                [&_ul]:[display:block!important] [&_ul]:[overflow:visible!important]
                [&_li]:[display:list-item!important] [&_li]:[list-style-type:disc!important]
                [&_li]:[list-style-position:outside!important] [&_li]:text-gray-300
                [&_li]:[margin-left:0!important] [&_li]:[padding-left:0.5rem!important]
                [&_li]:[margin-bottom:0.5rem!important] [&_li::marker]:text-blue-500
                prose-headings:text-white prose-p:leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {fullData[selectedLog.id] || "本文を読み込み中..."}
                </ReactMarkdown>
              </article>
            </div>

            <div className="p-6 bg-white/5 border-t border-white/5 flex justify-end">
              <button onClick={() => setSelectedLog(null)} className="px-10 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95">CLOSE</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}