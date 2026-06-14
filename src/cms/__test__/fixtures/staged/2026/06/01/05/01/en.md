# The Translation App That Learned a Dying Language From Forty Hours of Tape

In a university archive, a box of cassette tapes recorded over thirty years ago has sat largely untouched — field recordings of a language spoken fluently today by fewer than a dozen people, most of them over the age of eighty. Those forty hours of tape just became the entire training dataset for a new translation tool, and the results have surprised even the researchers who built it.

## A Different Kind of Training Data

Most modern translation systems are trained on enormous datasets — millions of sentence pairs scraped from books, websites, and subtitles. This project had access to none of that. Instead, researchers worked with what existed: decades-old recordings of conversations, stories, and songs, painstakingly transcribed by a small team of linguists and community members over the past two years.

The dataset broke down roughly like this:

```
Conversational recordings:   ~18 hours, transcribed and aligned with translations
Traditional stories/songs:   ~14 hours, partial translations from elder speakers
Word lists and grammar notes: ~8 hours, structured vocabulary and grammar rules
```

Forty hours is a tiny fraction of what large translation models typically use — often by a factor of a thousand or more. The team's approach leaned heavily on the structured grammar notes to help the model generalize beyond the specific sentences it had seen.

### Why This Matters Beyond One Language

Of the world's roughly seven thousand living languages, linguists estimate that a significant portion are at risk of falling out of use within the next century, many of them with no remaining written materials beyond exactly this kind of fragmentary archival recording.

The approach used here is deliberately designed to be repeatable:

- Start with whatever archival audio exists, even if fragmentary
- Prioritize community-led transcription over external linguists working alone
- Build small, structured grammar datasets rather than relying purely on volume
- Keep the resulting tool's training data and outputs under community control

> "We're not trying to replace fluent speakers or build something that 'preserves' the language in a jar. The goal is a tool that the community can use on their own terms — for teaching, for documentation, for whatever they decide." — a researcher on the project

## What the Tool Can and Cannot Do

The translation tool performs noticeably better on sentence structures and vocabulary that appeared frequently in the training recordings — everyday conversational phrases, common nouns, and the kinds of sentences found in traditional stories. It performs less reliably on technical or modern vocabulary that simply never appears in thirty-year-old field recordings, for the straightforward reason that the language itself may not have settled on standard terms for concepts that didn't exist when the recordings were made.

1. Strong performance: greetings, kinship terms, descriptions of daily activities, traditional narratives
2. Moderate performance: longer conversational exchanges with some structural complexity
3. Weak performance: technical, scientific, or modern technological vocabulary

Researchers describe this unevenness as expected and, in some ways, useful — it highlights exactly where community input is most needed if the tool is to grow alongside the language rather than freezing it in a thirty-year-old snapshot.

## Community Response

For the handful of remaining fluent speakers, many of whom are also grandparents and great-grandparents within their community, reactions have reportedly ranged from cautious interest to emotional. Several community members have begun using early versions of the tool with younger relatives, treating it less as a finished product and more as a conversation starter — a way to prompt questions that lead to a grandparent telling a story in their own words, which can then be recorded and added back into the dataset.

That loop — tool prompts conversation, conversation becomes new training data, new data improves the tool — is, researchers say, the actual long-term goal. Not a static translation app, but a living document that grows for as long as anyone is willing to keep talking.

## What Comes Next

The research team has published their training methodology, deliberately avoiding publishing the dataset itself out of respect for community ownership of the recordings. Several other communities working with similarly small archives of endangered languages have already reached out, and the team is now working on documentation to help non-technical community groups apply the same approach to their own archives — turning boxes of old tapes, in attics and university basements around the world, into something that might outlive the tapes themselves.
