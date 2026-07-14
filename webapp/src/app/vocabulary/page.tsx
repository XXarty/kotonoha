import { ContentDirectory } from "@/components/content-list";
import { getVocabularyDirectory } from "@/lib/content/repository";
import { contentRoute } from "@/lib/content/routes";

export default function VocabularyPage() {
  const directory = getVocabularyDirectory();
  return <main className="page shell"><p className="eyebrow">Vocabulary collection</p><h1 className="page-title">单词标本</h1><p className="lede">2,000 条常用日语词汇，按词性归档；每条都保留假名、罗马字、中文释义与来源。</p><ContentDirectory items={directory} hrefFor={contentRoute.vocabularyList} /></main>;
}
