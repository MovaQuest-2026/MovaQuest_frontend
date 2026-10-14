INCLUDE _variables.ink
{ helped_tourist:
    Thanks again! See you downtown. # speaker:npc_tourist
    -> END
}
Excuse me, do you know where the trolleybus stop to the centre is? # speaker:npc_tourist
* [Знаю! Зараз покажу. (I know! Let me show you.)]
    Oh, thanks! Which way do I go? # quiz:vysh_directions_1
    { quiz_ok:
        «Прямо», straight, then «праворуч», right... Got it! You helped a lot.
        ~ helped_tourist = true
        ~ trust += 1
    - else:
        Hm, that's a dead end... Never mind, I'll ask someone else. Thanks anyway!
    }
* [Вибачте, я тут уперше. (Sorry, it's my first time here.)]
    Me too. Let's look together!
- Oh, the trolleybus is coming! # clock:12:30
-> END
