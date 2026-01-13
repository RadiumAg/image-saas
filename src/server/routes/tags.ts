import z from 'zod';
import { db } from '../db/db';
import { protectedProcedure, router } from '../trpc-middlewares/trpc';
import { tags, files_tags, files } from '../db/schema';
import { eq, and, inArray, isNull } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { v4 as uuid } from 'uuid';
import WebSocket from 'ws';

// 定义分类类型
export type CategoryType = 'person' | 'location' | 'event';

// 生成随机颜色的辅助函数
function generateRandomColor(): string {
  const colors = [
    '#ef4444',
    '#f97316',
    '#f59e0b',
    '#eab308',
    '#84cc16',
    '#22c55e',
    '#10b981',
    '#14b8a6',
    '#06b6d4',
    '#0ea5e9',
    '#3b82f6',
    '#6366f1',
    '#8b5cf6',
    '#a855f7',
    '#d946ef',
    '#ec4899',
    '#f43f5e',
  ];

  return colors[Math.floor(Math.random() * colors.length)];
}

// 清理标签名称的辅助函数
function cleanTagNames(tagNames: string[]): string[] {
  return tagNames
    .map((name) => name.trim().toLowerCase())
    .filter((name) => name.length > 0 && name.length <= 20);
}

export const tagsRouter = router({
  // 获取用户所有标签
  getUserTags: protectedProcedure
    .input(z.object({ appId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { appId } = input;
      // 使用原生SQL查询以获取标签使用次数
      const result = await db.execute(`
      SELECT
        t.id,
        t.name,
        t.color,
        COUNT(ft.file_id) as count
      FROM tags t
      LEFT JOIN files_tags ft ON t.id = ft.tag_id
      WHERE t.user_id = '${ctx.session.user.id}' and t.app_id = '${appId}'
      GROUP BY t.id, t.name, t.color
      ORDER BY count DESC, t.name ASC
    `);

      const rows = result;

      return rows.map((row) => ({
        id: row.id as string,
        name: row.name as string,
        color: row.color as string,
        count: Number(row.count), // 修复：使用实际统计数量而不是result.length
      }));
    }),

  // 获取按分类分组的标签（只返回顶级分类）
  getTagsByCategory: protectedProcedure
    .input(
      z.object({
        appId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { appId } = input;

      // 使用原生SQL查询以获取标签及其文件数量
      const result = await db.execute(`
        SELECT
          t.id,
          t.name,
          t.category_type,
          t.color,
          t.sort,
          COUNT(DISTINCT ft.file_id) as count
        FROM tags t
        LEFT JOIN files_tags ft ON t.id = ft.tag_id
        LEFT JOIN files f ON ft.file_id = f.id AND f.deleted_at IS NULL
        WHERE t.user_id = '${ctx.session.user.id}'
          AND t.app_id = '${appId}'
          AND t.category_type IN ('person', 'location', 'event')
          AND t.parent_id IS NULL
        GROUP BY t.id, t.name, t.category_type, t.color, t.sort
        ORDER BY t.sort ASC, t.name ASC
      `);

      return result.map((row) => ({
        id: row.id as string,
        name: row.name as string,
        categoryType: row.category_type as CategoryType,
        color: row.color as string | null,
        sort: row.sort as number,
        count: Number(row.count) || 0,
      }));
    }),

  // 创建新标签
  createTag: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(20),
        color: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { name, color } = input;

      // 检查标签是否已存在
      const existingTag = await db.query.tags.findFirst({
        where: and(
          eq(tags.userId, ctx.session.user.id),
          eq(tags.name, name.trim().toLowerCase())
        ),
      });

      if (existingTag) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: '标签已存在',
        });
      }

      // 创建新标签
      const result = await db
        .insert(tags)
        .values({
          id: uuid(),
          name: name.trim(),
          color,
          userId: ctx.session.user.id,
        })
        .returning();

      return result[0];
    }),

  // 更新标签
  updateTag: protectedProcedure
    .input(
      z.object({
        tagId: z.string(),
        name: z.string().min(1).max(20).optional(),
        color: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { tagId, name, color } = input;

      // 构建更新对象
      const updates: { name?: string; color?: string } = {};
      if (name) updates.name = name.trim();
      if (color) updates.color = color;

      // 检查标签是否存在且属于当前用户
      const existingTag = await db.query.tags.findFirst({
        where: and(eq(tags.id, tagId), eq(tags.userId, ctx.session.user.id)),
      });

      if (!existingTag) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '标签不存在',
        });
      }

      // 如果更新名称，检查是否与其他标签冲突
      if (
        name &&
        name.trim().toLowerCase() !== existingTag.name.toLowerCase()
      ) {
        const conflictingTag = await db.query.tags.findFirst({
          where: and(
            eq(tags.userId, ctx.session.user.id),
            eq(tags.name, name.trim().toLowerCase()),
            eq(tags.id, tagId) // 排除当前标签
          ),
        });

        if (conflictingTag) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: '标签名称已存在',
          });
        }
      }

      // 执行更新
      const result = await db
        .update(tags)
        .set(updates)
        .where(and(eq(tags.id, tagId), eq(tags.userId, ctx.session.user.id)))
        .returning();

      return result[0];
    }),

  // 删除标签
  deleteTag: protectedProcedure
    .input(z.object({ tagId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { tagId } = input;

      // 检查标签是否存在且属于当前用户
      const existingTag = await db.query.tags.findFirst({
        where: and(eq(tags.id, tagId), eq(tags.userId, ctx.session.user.id)),
      });

      if (!existingTag) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '标签不存在',
        });
      }

      // 先删除所有关联
      await db.delete(files_tags).where(eq(files_tags.tagId, tagId));

      // 再删除标签
      await db
        .delete(tags)
        .where(and(eq(tags.id, tagId), eq(tags.userId, ctx.session.user.id)));

      return { success: true };
    }),

  // 为文件创建或获取标签
  createOrGetTags: protectedProcedure
    .input(z.object({ tagNames: z.array(z.string().min(1).max(20)) }))
    .mutation(async ({ ctx, input }) => {
      const { tagNames } = input;

      if (!tagNames.length) return [];

      const cleanNames = cleanTagNames(tagNames);
      if (!cleanNames.length) return [];

      // 查找已存在的标签
      const existingTags = await db.query.tags.findMany({
        where: and(
          eq(tags.userId, ctx.session.user.id),
          inArray(tags.name, cleanNames)
        ),
      });

      const existingTagNames = new Set(existingTags.map((tag) => tag.name));
      const newTagNames = cleanNames.filter(
        (name) => !existingTagNames.has(name)
      );

      // 创建新标签
      const newTags = [];
      if (newTagNames.length > 0) {
        const insertedTags = await db
          .insert(tags)
          .values(
            newTagNames.map((name) => ({
              id: uuid(),
              name,
              userId: ctx.session.user.id,
              color: generateRandomColor(),
            }))
          )
          .returning();

        newTags.push(...insertedTags);
      }

      return [...existingTags, ...newTags];
    }),

  // 为文件关联标签
  addTagsToFile: protectedProcedure
    .input(
      z.object({
        fileId: z.string(),
        tagNames: z.array(z.string().min(1).max(20)),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { fileId, tagNames } = input;

      if (!tagNames.length) return { addedTags: [] };

      // 获取或创建标签
      const tagRecords = await db.transaction(async (tx) => {
        const cleanNames = cleanTagNames(tagNames);

        // 查找已存在的标签
        const existingTags = await tx.query.tags.findMany({
          where: and(
            eq(tags.userId, ctx.session.user.id),
            inArray(tags.name, cleanNames)
          ),
        });

        const existingTagNames = new Set(existingTags.map((tag) => tag.name));
        const newTagNames = cleanNames.filter(
          (name) => !existingTagNames.has(name)
        );

        // 创建新标签
        const newTags = [];
        if (newTagNames.length > 0) {
          const insertedTags = await tx
            .insert(tags)
            .values(
              newTagNames.map((name) => ({
                id: uuid(),
                name,
                userId: ctx.session.user.id,
                color: generateRandomColor(),
              }))
            )
            .returning();

          newTags.push(...insertedTags);
        }

        return [...existingTags, ...newTags];
      });

      // 关联文件和标签
      await db
        .insert(files_tags)
        .values(
          tagRecords.map((tag) => ({
            fileId,
            tagId: tag.id,
          }))
        )
        .onConflictDoNothing(); // 避免重复关联

      return { addedTags: tagRecords };
    }),

  // 获取文件的所有标签
  getFileTags: protectedProcedure
    .input(z.object({ fileId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { fileId } = input;

      const result = await db.query.files_tags.findMany({
        where: eq(files_tags.fileId, fileId),
        with: {
          tag: true,
        },
      });

      return result.map((ft) => ft.tag);
    }),

  // 从文件移除标签
  removeTagsFromFile: protectedProcedure
    .input(
      z.object({
        fileId: z.string(),
        tagIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { fileId, tagIds } = input;

      if (tagIds && tagIds.length > 0) {
        // 删除指定的标签
        await db
          .delete(files_tags)
          .where(
            and(
              eq(files_tags.fileId, fileId),
              inArray(files_tags.tagId, tagIds)
            )
          );
      } else {
        // 删除所有标签
        await db.delete(files_tags).where(eq(files_tags.fileId, fileId));
      }

      return { success: true };
    }),

  // 清理未使用的标签
  cleanupUnusedTags: protectedProcedure.mutation(async ({ ctx }) => {
    const result = await db.execute(`
      DELETE FROM tags 
      WHERE id IN (
        SELECT t.id FROM tags t
          LEFT JOIN files_tags ft ON t.id = ft.tag_id
          WHERE ft.tag_id IS NULL 
          AND t.user_id = '${ctx.session.user.id}'
      )
    `);

    return { deletedCount: result.length };
  }),

  // AI 识别图片标签
  recognizeImageTags: protectedProcedure
    .input(
      z.object({
        fileId: z.string(),
        imageUrl: z.string().optional(), // 可选，如果提供则直接使用，否则从文件记录获取
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { fileId, imageUrl: providedImageUrl } = input;

      // 获取文件信息
      const fileRecord = await db.query.files.findFirst({
        where: and(eq(files.id, fileId), eq(files.userId, ctx.session.user.id)),
      });

      if (!fileRecord) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '文件不存在或无权访问',
        });
      }

      // 使用提供的图片URL或文件记录中的URL
      const imageUrl = providedImageUrl || fileRecord.url;

      if (!imageUrl) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '无法获取图片URL',
        });
      }

      try {
        // 调用AI服务识别图片标签
        const recognizedTags = await recognizeImageWithAI(imageUrl);

        if (!recognizedTags || recognizedTags.length === 0) {
          return {
            success: true,
            message: 'AI未能识别出有效的标签',
            tags: [],
          };
        }

        // 清理和过滤标签
        const cleanedTags = cleanTagNames(recognizedTags);

        if (cleanedTags.length === 0) {
          return {
            success: true,
            message: '识别的标签都不符合要求',
            tags: [],
          };
        }

        // 获取或创建标签
        const tagRecords = await db.transaction(async (tx) => {
          // 查找已存在的标签
          const existingTags = await tx.query.tags.findMany({
            where: and(
              eq(tags.userId, ctx.session.user.id),
              inArray(tags.name, cleanedTags)
            ),
          });

          const existingTagNames = new Set(existingTags.map((tag) => tag.name));
          const newTagNames = cleanedTags.filter(
            (name) => !existingTagNames.has(name)
          );

          // 创建新标签
          const newTags = [];
          if (newTagNames.length > 0) {
            const insertedTags = await tx
              .insert(tags)
              .values(
                newTagNames.map((name) => ({
                  id: uuid(),
                  name,
                  userId: ctx.session.user.id,
                  color: generateRandomColor(),
                }))
              )
              .returning();

            newTags.push(...insertedTags);
          }

          return [...existingTags, ...newTags];
        });

        // 关联文件和标签
        await db
          .insert(files_tags)
          .values(
            tagRecords.map((tag) => ({
              fileId,
              tagId: tag.id,
            }))
          )
          .onConflictDoNothing(); // 避免重复关联

        return {
          success: true,
          message: `成功识别并添加了 ${tagRecords.length} 个标签`,
          tags: tagRecords,
        };
      } catch (error) {
        console.error('AI识别图片标签失败:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'AI识别服务暂时不可用，请稍后重试',
        });
      }
    }),
});

// AI图片识别服务函数
async function recognizeImageWithAI(imageUrl: string): Promise<string[]> {
  try {
    // 这里可以根据实际需求选择不同的AI服务
    // 以下是几个可选的实现方案：

    // 方案1: 使用OpenAI Vision API
    const tags = await recognizeWithOpenAI(imageUrl);
    if (tags.length > 0) return tags;

    // 方案2: 使用Google Cloud Vision API (备选)
    // const tags = await recognizeWithGoogleVision(imageUrl);
    // if (tags.length > 0) return tags;

    // 方案3: 使用Azure Computer Vision API (备选)
    // const tags = await recognizeWithAzureVision(imageUrl);
    // if (tags.length > 0) return tags;

    return [];
  } catch (error) {
    console.error('AI识别服务调用失败:', error);
    return [];
  }
}

// 讯飞星火图片理解 API 实现
async function recognizeWithOpenAI(imageUrl: string): Promise<string[]> {
  const appId = process.env.XFYUN_APP_ID;
  const apiKey = process.env.XFYUN_API_KEY;
  const apiSecret = process.env.XFYUN_API_SECRET;

  if (!appId || !apiKey || !apiSecret) {
    console.warn(
      '未配置讯飞星火 API 凭证（XFYUN_APP_ID, XFYUN_API_KEY, XFYUN_API_SECRET），跳过识别'
    );
    return [];
  }

  try {
    // 1. 下载图片并转换为 base64
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      console.error(
        '下载图片失败:',
        imageResponse.status,
        imageResponse.statusText
      );
      return [];
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');

    // 2. 生成签名
    const date = new Date().toUTCString();
    const authorization = generateXfyunSignature(
      date,
      'GET',
      '/v2.1/image',
      apiKey,
      apiSecret
    );

    // 3. 构建请求体
    const requestBody = {
      header: {
        app_id: appId,
      },
      parameter: {
        chat: {
          domain: 'imagev3',
          temperature: 0.5,
          top_k: 4,
          max_tokens: 2028,
        },
      },
      payload: {
        message: {
          text: [
            {
              role: 'user',
              content: imageBase64,
              content_type: 'image',
            },
            {
              role: 'user',
              content:
                '请分析这张图片，并判断它属于以下哪个类别：人物、地点、事务。只返回一个类别名称，不要包含其他文字。例如：人物、地点或事务',
              content_type: 'text',
            },
          ],
        },
      },
    };

    // 4. 使用 WebSocket 发送请求
    return new Promise<string[]>((resolve, reject) => {
      const wsUrl = `wss://spark-api.cn-huabei-1.xf-yun.com/v2.1/image?authorization=${encodeURIComponent(
        authorization
      )}&date=${encodeURIComponent(
        date
      )}&host=spark-api.cn-huabei-1.xf-yun.com`;

      const ws = new WebSocket(wsUrl);
      let fullContent = '';

      ws.on('open', () => {
        ws.send(JSON.stringify(requestBody));
      });

      ws.on('message', (data) => {
        try {
          const response = JSON.parse(data.toString());

          if (response.header?.code !== 0) {
            console.error('讯飞星火返回错误:', response.header?.message);
            ws.close();
            resolve([]);
            return;
          }

          const content = response.payload?.choices?.text?.[0]?.content;
          if (content) {
            fullContent += content;
          }

          if (response.header?.status === 2) {
            ws.close();

            if (!fullContent) {
              console.warn('讯飞星火返回空内容');
              resolve([]);
              return;
            }

            let tagsText = fullContent;
            tagsText = tagsText.replace(/\*\*/g, '').replace(/`/g, '');

            const tags = tagsText
              .split(/[,，、\s\n]+/)
              .map((tag) => tag.trim())
              .filter((tag) => tag.length > 0 && tag.length <= 10);

            resolve(tags);
          }
        } catch (error) {
          console.error('解析讯飞星火响应失败:', error);
          ws.close();
          resolve([]);
        }
      });

      ws.on('error', (error) => {
        console.error('讯飞星火 WebSocket 错误:', error);
        resolve([]);
      });

      ws.on('close', () => {
        if (!fullContent) {
          resolve([]);
        }
      });

      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
          console.warn('讯飞星火 API 请求超时');
        }
        resolve([]);
      }, 30000);
    });
  } catch (error) {
    console.error('讯飞星火识别失败:', error);
    return [];
  }
}

// 生成讯飞星火 API 签名
function generateXfyunSignature(
  date: string,
  method: string,
  uri: string,
  apiKey: string,
  apiSecret: string
): string {
  const crypto = require('crypto');

  // 按照讯飞星火文档的格式构建签名字符串
  const signatureOrigin = `host: spark-api.cn-huabei-1.xf-yun.com\ndate: ${date}\n${method} ${uri} HTTP/1.1`;

  // 使用 hmac-sha256 生成签名
  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(signatureOrigin)
    .digest('base64');

  // 构建 authorization_origin
  const authorizationOrigin = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;

  // 将 authorization_origin 进行 base64 编码，生成最终的 authorization
  const authorization = Buffer.from(authorizationOrigin).toString('base64');

  return authorization;
}
