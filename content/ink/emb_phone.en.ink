INCLUDE _variables.ink
Your phone finally comes alive. A message from Solomiia: # speaker:phone # clock:19:30
«Я трохи запізнююсь! Шукай мене біля мосту: червона куртка й окуляри.»
Who are you looking for? # quiz:emb_find_1
{ quiz_ok:
    Red jacket, «червона куртка», glasses, «окуляри», by the bridge. Let's go! # flag:know_outfit
- else:
    You read it again: «червона куртка й окуляри», a red jacket and glasses. # flag:know_outfit
}
-> END
