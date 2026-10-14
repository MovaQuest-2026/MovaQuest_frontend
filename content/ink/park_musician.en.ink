INCLUDE _variables.ink
Hi! Want a song? I play here every day, «кожного дня». # speaker:npc_musician
* [Так, заграй, будь ласка! (Yes, play please!)]
    ~ polite = true
    ~ trust += 1
    Here's a song about the Southern Bug, «Південний Буг». Our river, our music.
* [Ні, дякую. Як дійти до Соборної? (No, thanks. How do I get to Soborna?)]
    Pity! Then listen.
- Go «прямо» through the park, then «праворуч», and you're on Soborna. # flag:park_route_known
-> END
