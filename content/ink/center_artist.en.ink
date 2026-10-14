INCLUDE _variables.ink
{ has_drawing:
    Let the drawing, «малюнок», remind you of Vinnytsia. # speaker:npc_artist
    -> END
}
Oh, rain again, «знову дощ»! My sketches will get wet... # speaker:npc_artist
* {has_umbrella} [Тримайте мою парасольку! (Take my umbrella!)]
    Really? Thank you, you're saving me! # take:umbrella
    ~ has_umbrella = false
    Here, take this drawing of the fountain. I made it yesterday on the embankment. # give:drawing
    ~ has_drawing = true
    ~ trust += 1
* [Що ви малюєте? (What are you drawing?)]
    Mury, "the Walls". There used to be a monastery here, now there are exhibitions and cafés.
* [Вибачте, у мене немає парасольки. (Sorry, I don't have an umbrella.)]
    No worries, I'll hide under the arch.
- -> END
