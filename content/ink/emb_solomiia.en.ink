INCLUDE _variables.ink
We finally meet! How was my day-quest? # speaker:npc_solomiia
{ task_flowers:
    Flowers for Grandma! She'll be so happy. # take:flowers
- else:
    No flowers? Never mind, we'll buy some tomorrow together.
}
{ task_dessert:
    And cherry strudel! How did you know I love it? # take:dessert
- else:
    No dessert? No problem, I know a great café.
}
{ task_show_time:
    And you know when the show starts! «О восьмій», at eight. Any minute now.
- else:
    The show is at eight, «о восьмій». We made it just in time.
}
{ has_drawing:
    Wait, is this drawing by the artist from Mury? My grandma knows him!
}
By the way, tomorrow we could visit the Pirogov estate.
* {knows_pirogov} [Пирогов був хірургом! (Pirogov was a surgeon!)]
    Wow, you already know! Then you'll be my tour assistant.
    ~ trust += 1
* {not knows_pirogov} [А хто такий Пирогов? (Who is Pirogov?)]
    A famous surgeon, «хірург». I'll tell you on the way.
* [Із задоволенням! (With pleasure!)]
    ~ polite = true
    «Домовились!» Deal!
- Look! The sun is setting... The fountain! # clock:20:00 # cutscene:fountain
{
- trust >= 6 && has_drawing:
    -> ending_best
- trust >= 3:
    -> ending_good
- else:
    -> ending_basic
}

=== ending_best ===
Grandma says everyone is invited to dinner: you, me, and the artist from Mury. # ending:best
See all those people waving at you? Nina, Halyna, Ostap... The city remembers you.
-> END

=== ending_good ===
Come to our place for dinner, I'll introduce you to my family. # ending:good
-> END

=== ending_basic ===
The main thing is you made it! Next time we'll do a tour together. # ending:basic
-> END
