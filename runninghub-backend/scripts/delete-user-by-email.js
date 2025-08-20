// delete-user-by-email.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	const email = process.argv[2];
	if (!email) {
		console.error('用法: node scripts/delete-user-by-email.js <email>');
		process.exit(1);
	}
	const user = await prisma.user.findUnique({ where: { email } });
	if (!user) {
		console.log(`用户不存在: ${email}`);
		process.exit(0);
	}
	console.log(`将要删除用户 ${user.id} (${email}) 及其关联刷新令牌...`);
	await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
	await prisma.user.delete({ where: { id: user.id } });
	console.log('删除完成');
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
