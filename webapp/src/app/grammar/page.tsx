import { ContentDirectory } from "@/components/content-list";
import { getGrammarDirectory } from "@/lib/content/repository";
import { contentRoute } from "@/lib/content/routes";

export default function GrammarPage() {
  const directory = getGrammarDirectory();
  const total = directory.reduce((sum, item) => sum + item.count, 0);

  return (
    <main className="page shell directory-page">
      <header className="directory-intro">
        <p className="eyebrow">文のしくみを、ひとつずつ</p>
        <h1 className="page-title">语法路径</h1>
        <p className="lede">
          共 {total.toLocaleString("zh-CN")} 个语法单元。四条路径从句子基础出发，陪你走到更完整、更自然的表达。
        </p>
      </header>
      <section aria-labelledby="grammar-paths-title" className="directory-section grammar-directory-section">
        <div className="directory-section-heading">
          <h2 id="grammar-paths-title">循序前行</h2>
          <p>每条路径的单元数量由当前公开课程实时计算。</p>
        </div>
        <ContentDirectory items={directory} hrefFor={contentRoute.grammarList} />
      </section>
    </main>
  );
}
