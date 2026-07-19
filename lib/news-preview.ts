import { filterNewsItems, paginateNewsItems } from "@/lib/news-repository";
import type { NewsContentBlock, NewsItem, NewsListItem } from "@/lib/news-types";
import type { Launch } from "@/lib/types";

const titles = [
  "SpaceX 成功完成新一代星链卫星发射", "NASA 月球门户空间站关键模块通过测试", "欧洲航天局公布深空探测年度报告",
  "新型重型运载火箭完成静态点火试验", "詹姆斯·韦布望远镜发现系外行星大气线索", "火星车在古老河床三角洲发现沉积物迹象",
  "中国航天发布年度多任务发射计划", "商业月球着陆器进入最终装配阶段", "国际空间站新一批科学实验启程",
  "小行星采样任务返回舱完成环境测试", "太阳观测卫星记录到罕见日冕活动", "可重复使用火箭发动机完成长程点火",
];
const summaries = [
  "任务团队确认主要系统运行正常，本次飞行为后续批次部署和轨道运营积累了新的数据。",
  "研究人员将利用最新观测结果继续分析目标天体的组成、演化过程与潜在科学价值。",
  "这项进展标志着项目进入下一阶段，多支国际团队将在未来数月完成联合验证。",
];
const images = [
  "/assets/whenliftoff/news_feature.jpg", "/assets/whenliftoff/card_launch_1.jpg", "/assets/whenliftoff/news_thumb_earth.jpg",
  "/assets/whenliftoff/card_launch_2.jpg", "/assets/whenliftoff/article_hero.jpg", "/assets/whenliftoff/related_mission.jpg",
  "/assets/whenliftoff/news_thumb_launch.jpg", "/assets/whenliftoff/card_launch_3.jpg", "/assets/whenliftoff/news_thumb_rocket.jpg",
];

export const previewNewsItems: NewsListItem[] = Array.from({ length: 30 }, (_, index) => {
  const published = new Date(Date.UTC(2026, 6, 17, 4 - Math.floor(index / 3), -(index % 3) * 17)).toISOString();
  const contentType = index % 5 === 1 ? "blog" : index % 5 === 2 ? "report" : "article";
  return {
    content_type: contentType, external_id: index + 1, title: `Preview spaceflight story ${index + 1}`,
    title_cn: titles[index % titles.length], summary: null, summary_cn: summaries[index % summaries.length],
    authors: [{ name: index % 2 ? "任务报道组" : "航天编辑部" }], original_url: "https://spaceflightnewsapi.net/",
    image_url: images[index % images.length], news_site: ["SpaceNews", "NASA", "ESA", "中国航天报"][index % 4],
    published_at: published, api_updated_at: published, featured: index === 0, related_launch_ids: [], related_event_ids: [],
    translated_block_count: 7, translation_status: "complete", created_at: published, synced_at: published,
  };
});

const previewBlocks: NewsContentBlock[] = [
  { id: "b1", type: "paragraph", text: "北京时间今天凌晨，任务团队按计划完成发射。火箭从发射台升空后，各级飞行状态稳定，载荷随后顺利进入预定轨道。" },
  { id: "b2", type: "heading", text: "任务按计划推进" },
  { id: "b3", type: "paragraph", text: "发射控制中心确认遥测与通信链路工作正常。工程团队将在接下来的数小时内完成轨道参数核验，并依次启动载荷平台的关键子系统。" },
  { id: "b4", type: "quote", text: "这次任务为后续部署提供了重要的在轨数据，所有关键节点均在计划时间内完成。" },
  { id: "b5", type: "heading", text: "下一阶段工作" },
  { id: "b6", type: "list_item", text: "完成载荷健康状态检查与姿态控制测试" },
  { id: "b7", type: "list_item", text: "校准通信设备并验证地面站切换流程" },
  { id: "b8", type: "paragraph", text: "正式运营前，任务团队还将进行多轮测试。相关结果会在后续技术简报中公布。" },
];

export function previewNewsItem(type: string, id: number): NewsItem | null {
  const listItem = previewNewsItems.find((item) => item.content_type === type && item.external_id === id);
  if (!listItem) return null;
  return { ...listItem, source_blocks: [], body_cn_blocks: previewBlocks, metadata_hash: "preview", content_hash: "preview", processing_error: null, last_attempted_at: null };
}

export function previewNewsPage(cursor?: string, query?: string) {
  return paginateNewsItems(filterNewsItems(previewNewsItems, query), cursor, 10, previewNewsItems[0]?.synced_at ?? null);
}

export const previewLaunch: Launch = {
  external_id: "f47ac10b-58cc-4372-a567-0e02b2c3d479", slug: "preview-starlink", name: "Starlink 10-12", name_cn: "星链 10-12",
  mission_description: null, mission_description_cn: null, provider: "SpaceX", provider_cn: null, rocket_name: "Falcon 9 Block 5",
  status: "Go", status_cn: "计划发射", launch_time_utc: new Date(Date.now() + 49 * 60 * 60 * 1000).toISOString(), window_end_utc: null,
  location: "Cape Canaveral SLC-40", location_cn: "佛罗里达州 卡纳维拉尔角 SLC-40", country_code: "USA", pad: "SLC-40",
  image_url: "/assets/whenliftoff/related_mission.jpg", webcast_url: null, source_url: null, api_updated_at: null, synced_at: new Date().toISOString(),
};
