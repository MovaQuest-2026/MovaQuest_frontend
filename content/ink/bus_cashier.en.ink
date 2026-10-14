INCLUDE _variables.ink
«Доброго ранку!» That's "Good morning!" How can I help? # speaker:npc_cashier
{ phone_charging:
    The socket, «розетка», is by the window under the board.
    -> END
}
* [Мій телефон розрядився. (My phone died.)]
    Oh, it happens. So what do you need? # quiz:bus_charge_1
    { quiz_ok:
        «Зарядити телефон» — to charge your phone. Of course! The socket is in the waiting hall, by the window.
        ~ trust += 1
    - else:
        You want to charge it, right? Say: «Де можна зарядити телефон?» The socket is by the window.
    }
    ~ phone_charging = true
    And watch your bag, «сумка». It gets busy here. # clock:09:30
* [Де тут вихід? (Where is the exit?)]
    «Вихід» is to the right. But maybe charge your phone first? Your screen is black.
- -> END
