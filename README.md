# glade-kit: пролог «Галявина абетки»

Розпакувати в корінь репозиторію поверх оновленої гілки `dev`:

```bash
unzip -o glade-kit.zip -d /tmp/glade && cp -r /tmp/glade/glade-kit/{public,content,src,snippets,docs} .
cp /tmp/glade/glade-kit/prompts/L8-glade.md prompts/
```

Далі `prompts/00-preamble.md` + `prompts/L8-glade.md` у Claude Code.

| Шлях | Що |
| --- | --- |
| `public/assets/characters/` | hero, marta, yarynka у нативному розмірі пікселя (оригінали були збільшені в 4 рази) |
| `public/assets/backgrounds/glade.png` | галявина 480×270, зменшена з Tileset.png без втрат |
| `content/ink/` | діалоги галявини en/uk, `_variables.ink` і `dialogues.meta.json` з новими записами |
| `src/mocks/quizzes/alpha_*.json` | 9 вправ на абетку |
| `snippets/` | зона `glade` і кроки квесту, Claude Code переносить їх у моки й видаляє теку |
| `docs/glade-story.md` | сюжет для команди |
