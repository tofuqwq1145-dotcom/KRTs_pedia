import Breadcrumb from '@/components/Breadcrumb';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: '写作指导 | KRTPedia' };

export default function GuidePage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 fade-in">
      <Breadcrumb items={[{ label: '写作指导' }]} />
      <h1 className="font-serif text-4xl mb-8 text-archive-text border-b border-archive-border pb-6">写作指导</h1>
      <div className="text-sm leading-[1.9] space-y-8 text-archive-text">
        <p className="text-archive-muted tracking-widest">KRTPedia 是一座面向服务器的互动档案馆：它记录这些发生在空岛与现实之间的事件、国家和人们。以下为投稿规范，请务必阅读后再动笔。</p>

        <section>
          <h2 className="font-serif text-2xl mb-3 text-archive-text">一、基本流程</h2>
          <ol className="list-decimal ml-6 space-y-2">
            <li>登录账号（邮箱注册即可）；</li>
            <li>前往「投稿」页面，填写标题、选择分类与可选的分级/标签；</li>
            <li>使用 Markdown 撰写正文，右侧可实时预览；</li>
            <li>提交后由站主审核，通过后内容全站公开（含国内镜像站点）。</li>
          </ol>
        </section>

        <section>
          <h2 className="font-serif text-2xl mb-3 text-archive-text">二、条目构成</h2>
          <p className="mb-3">一篇合格的档案包含三个部分：</p>
          <ul className="list-disc ml-6 space-y-2">
            <li><strong>基本信息块</strong>：落在开头的要点式列表，用「**」加粗标出（如：时间、地点、参战方、状态）。参考投稿页的各分类模板；</li>
            <li><strong>正文</strong>：按主题分层撰写，用 <code>##</code> 二级标题分段（概述 / 经过 / 影响），逻辑清楚、按时间先后展开；</li>
            <li><strong>参考资料（可选）</strong>：末尾用列表罗列游戏内截图、聊天记录链接等佐证。</li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-2xl mb-3 text-archive-text">三、写作规范</h2>
          <ul className="list-disc ml-6 space-y-3">
            <li><strong>写事实，不写论断</strong>：档案记录「发生了什么」；评论与评价请放交流群讨论，避免进入正文；</li>
            <li><strong>标注时空</strong>：重要事件注明时间（服务器周目/日期）与地点，避免读者无从定位；</li>
            <li><strong>引用要注明</strong>：引用他人言论请用 <code>&gt;</code> 引用语法，并注明出处；</li>
            <li><strong>区分现实与虚构</strong>：确属虚构演绎的内容请注明「虚构」，不得冒充史实；</li>
            <li><strong>语气中立</strong>：不使用攻击性、贬损性措辞；有争议处尽量并列双方说法；</li>
            <li><strong>拒绝无效内容</strong>：禁止人身攻击、刷屏、广告、明显无意义或抄袭他人成果的条目。</li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-2xl mb-3 text-archive-text">四、分级与标签</h2>
          <p className="mb-3">站主按主题划分「分级（系列）」目录，用以组织长线内容（如「政治篇」「战争篇」）。投稿时如符合某个分级的收录范围，请选择对应的分级；也可用逗号分隔添加最多 8 个标签（如：外交、同盟、经济），帮助读者检索。不确定归属时可不设置，交由站主归类。</p>
        </section>

        <section>
          <h2 className="font-serif text-2xl mb-3 text-archive-text">五、审核与修改</h2>
          <p className="mb-3">每条投稿均由站主审核。已发布的档案仍可随时编辑——在「个人信息」中找到该条目并选择「编辑」，修改提交后需重新审核，通过前原版本仍在线可用。被驳回时备注栏会写明理由，修改后重新提交即可。</p>
        </section>

        <section>
          <h2 className="font-serif text-2xl mb-3 text-archive-text">六、常见问题</h2>
          <ul className="space-y-3">
            <li><strong>Q：如何插入图片？</strong> 正文工具栏的「+ 上传图片」会插入 <code>![图片](网址)</code>，预览中即可确认位置。</li>
            <li><strong>Q：我的档案能写多长？</strong> 不限长度，但请保证每段都有信息量，避免空洞凑字。</li>
            <li><strong>Q：错误信息能纠正吗？</strong> 可以，联系站主或直接利用编辑功能更正。</li>
          </ul>
        </section>
      </div>

      <div className="mt-10 border-t border-archive-border pt-6 text-center">
        <p className="text-xs tracking-widest text-archive-muted">为后人留档。谢谢你，撰稿人。</p>
      </div>
    </div>
  );
}