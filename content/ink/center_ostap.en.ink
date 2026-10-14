INCLUDE _variables.ink
{ knows_pirogov:
    The courtyard on the right takes you to Mury. Good luck! # speaker:npc_ostap
    -> END
}
{ pirogov_asked:
    Pirogov was a «хірург», a surgeon, remember? Go around via Soborna. # speaker:npc_ostap
    -> END
}
Hi! I'm Ostap. I study to be a doctor, «лікар», at the Pirogov Medical University. Heard of him? # speaker:npc_ostap
* [Ні, хто це? (No, who is that?)]
* [Трохи. Розкажи! (A bit. Tell me!)]
- Mykola Pirogov was a great surgeon, «хірург». He was one of the first to operate with ether anaesthesia right in the field, during war.
He spent his last years near Vinnytsia, at the Vyshnia estate. It's a museum now.
So, a quick check: who was Pirogov? # quiz:pirogov_1
~ pirogov_asked = true
{ quiz_ok:
    Exactly! You listen well.
    ~ knows_pirogov = true
    ~ trust += 1
    Take this courtyard, it's a shortcut to Mury. # flag:shortcut_open
- else:
    Not quite. He was a «хірург», a doctor who does operations.
    Here's a postcard with the short version. # give:pirogov_card
    Go around via Soborna, you won't get lost.
}
-> END
