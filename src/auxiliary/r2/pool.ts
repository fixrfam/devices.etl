/** Run up to `max` async tasks in parallel from an iterable. */
export async function asyncPool<T, R>(
	max: number,
	items: Iterable<T>,
	fn: (item: T) => Promise<R>,
): Promise<R[]> {
	const results: R[] = [];
	const running = new Set<Promise<void>>();

	for (const item of items) {
		if (running.size >= max) {
			await Promise.race(running);
		}

		const i = results.length;
		results.push(undefined!);

		const p = fn(item).then((r) => {
			results[i] = r;
		});
		running.add(p);
		p.finally(() => running.delete(p));
	}

	await Promise.all(running);
	return results;
}
