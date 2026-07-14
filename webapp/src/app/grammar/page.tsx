import { ContentDirectory } from "@/components/content-list";
import { getGrammarDirectory } from "@/lib/content/repository";
import { contentRoute } from "@/lib/content/routes";

export default function GrammarPage() {
  const directory = getGrammarDirectory();
  const total = directory.reduce((sum, item) => sum + item.count, 0);
  return <main className="page shell"><p className="eyebrow">Grammar path</p><h1 className="page-title">语法路径</h1><p className="lede">共 {total} 个语法单元，从句子基础走向助词、动词变化和日常表达。</p><ContentDirectory items={directory} hrefFor={contentRoute.grammarList} /></main>;
}
