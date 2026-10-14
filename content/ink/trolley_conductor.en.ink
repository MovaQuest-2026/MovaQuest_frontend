INCLUDE _variables.ink
«Проїзд оплачуємо!» Fares, please! Cash or card, «готівка чи картка»? # speaker:npc_conductor
* [Ask about paying]
    Well? Go on, I'm listening. # quiz:trolley_card_1
    { quiz_ok:
        Of course you can. Tap it on the terminal. Here's your ticket, «квиток».
        ~ trust += 1
    - else:
        Sorry? Ah, a card! Yes, you can. Here's the terminal.
    }
* [Silently show your card]
    Ah, a card. Tap it here.
- Listen to the announcements so you don't miss your stop!
-> END
