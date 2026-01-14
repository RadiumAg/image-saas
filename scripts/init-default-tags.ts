import 'dotenv/config';
import { db } from '../src/server/db/db';
import { apps, tags } from '../src/server/db/schema';
import { v4 as uuid } from 'uuid';
import { eq, and, isNull } from 'drizzle-orm';

// 定义默认标签配置
const DEFAULT_TAGS = [
  { name: '人物', categoryType: 'person' as const, color: '#3b82f6' },
  { name: '地点', categoryType: 'location' as const, color: '#22c55e' },
  { name: '事务', categoryType: 'event' as const, color: '#f59e0b' },
];

async function initDefaultTags() {
  console.log('开始为所有应用初始化默认标签...');

  // 获取所有应用
  const allApps = await db.query.apps.findMany({
    where: (apps, { eq, and, isNull }) => and(isNull(apps.deleteAt)),
  });

  console.log(`找到 ${allApps.length} 个应用`);

  for (const app of allApps) {
    console.log(`\n处理应用: ${app.name} (${app.id})`);

    // 检查该应用是否已有默认标签
    const existingTags = await db.query.tags.findMany({
      where: and(eq(tags.appId, app.id), isNull(tags.parentId)),
    });

    const existingCategoryTypes = existingTags.map(t => t.categoryType);

    // 找出需要创建的标签
    const tagsToCreate = DEFAULT_TAGS.filter(
      tag => !existingCategoryTypes.includes(tag.categoryType)
    );

    if (tagsToCreate.length === 0) {
      console.log(`  应用 ${app.name} 已有所有默认标签，跳过`);
      continue;
    }

    console.log(`  需要创建 ${tagsToCreate.length} 个标签:`);
    tagsToCreate.forEach(tag =>
      console.log(`    - ${tag.name} (${tag.categoryType})`)
    );

    // 创建标签
    await db.insert(tags).values(
      tagsToCreate.map(tag => ({
        id: uuid(),
        name: tag.name,
        categoryType: tag.categoryType,
        color: tag.color,
        userId: app.userId,
        appId: app.id,
        sort: 0,
        parentId: null,
      }))
    );

    console.log(`  ✅ 应用 ${app.name} 默认标签创建完成`);
  }

  console.log('\n✅ 所有应用的默认标签初始化完成!');
  process.exit(0);
}

initDefaultTags().catch(error => {
  console.error('初始化失败:', error);
  process.exit(1);
});
