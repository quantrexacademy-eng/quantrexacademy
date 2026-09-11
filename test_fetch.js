async function test() {
  const target = "https://firebasestorage.googleapis.com/v0/b/quantrexacademy-app.firebasestorage.app/o/questions%2Ffigs%2Firodov%2Fqx-irodov-8d50ab2bb312bc7c.png?alt=media&v=stem2";
  const h = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8"
  };
  const res = await fetch(target, { headers: h, redirect: "follow" });
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Body:", text.substring(0, 100));
}
test();
