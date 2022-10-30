import * as h3 from 'h3';
import * as cors from 'cors';
import { Type, validateQuery, validateBody } from 'h3-typebox';

const app = h3.createApp();
const router = h3.createRouter();

app.use(h3.eventHandler(async event => {
	console.log('api req');
}));

// CORS by expressのミドルウェア
app.use(h3.fromNodeMiddleware(cors()));

// デフォルトヘッダーとか
app.use(h3.eventHandler(async event => {
	event.res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
}));

router.get('/endpoint', h3.eventHandler(async event => {
	// これだけで、クエリ文字列の取得とバリデートをして Record<string, string>　にしてくれる。
	// エラーは勝手に400を返してくれる
	// クエリ文字列なのでvalueはstringしかあり得ないので注意
	// なお ?a=1&a=2 みたいな value が Array になるパターンを弾いてくれる
	const query = validateQuery(event, Type.Record(Type.String(), Type.String()));

	console.log('query', query);
	return { res: 'ok', query };
}));

router.post('/post', h3.eventHandler(async event => {
	// h3.readBody() でテキストやJSONなどを取得出来る
	// JSONとみなすContent-Typeみたいな概念はない。JSONぽかったらパースしてくれる。
	// JSONだったら Object | Array | Number | Boolean が返る
	// 不正なJSONだったら String が返る
	// ペイロードなしなら undefined が返る
	// なお、formdataでも受け入れる

	// これだけでクエリ文字列の取得とバリデートをして Record<string, unknown>　にしてくれる。
	// エラーは勝手に400を返してくれる
	// これはtypebox形式だけど、JSON Schema にも出来る。でもtypeboxで定義したほうが使いやすいかも。
	const body = await validateBody(event, Type.Record(Type.String(), Type.Unknown()));

	console.log('body', body);
	return { res: 'ok', body };
}));

app.use(router);
export default app;
