const pool = require('../config/db');

const theatres = [
  {
    name: 'National Theatre',
    location: 'Athens',
    description: 'Central stage with contemporary productions'
  },
  {
    name: 'Royal Theatre',
    location: 'Thessaloniki',
    description: 'Historic venue featuring classic and modern plays'
  },
  {
    name: 'Apollo Theatre',
    location: 'Patras',
    description: 'Intimate theater specializing in experimental works'
  }
];

const shows = [
  {
    theatreIndex: 0,
    title: 'Antigone',
    description: 'Classical tragedy in a modern adaptation',
    duration: 120,
    ageRating: '12+'
  },
  {
    theatreIndex: 0,
    title: 'Medea',
    description: 'Powerful tragedy about love and revenge',
    duration: 110,
    ageRating: '14+'
  },
  {
    theatreIndex: 0,
    title: 'The Frogs',
    description: 'Comedic masterpiece with witty dialogue and satire',
    duration: 140,
    ageRating: '12+'
  },
  {
    theatreIndex: 1,
    title: 'Hamlet',
    description: 'The ultimate revenge tragedy, Shakespeare\'s masterpiece',
    duration: 180,
    ageRating: '14+'
  },
  {
    theatreIndex: 1,
    title: 'Electra',
    description: 'Ancient Greek drama exploring fate and justice',
    duration: 130,
    ageRating: '12+'
  },
  {
    theatreIndex: 1,
    title: 'Lysistrata',
    description: 'Hilarious comedy about women stopping war',
    duration: 135,
    ageRating: '15+'
  },
  {
    theatreIndex: 2,
    title: 'Waiting for Godot',
    description: 'Experimental drama questioning existence and meaning',
    duration: 120,
    ageRating: '16+'
  },
  {
    theatreIndex: 2,
    title: 'The Bacchae',
    description: 'Rituals and madness in this tragic masterpiece',
    duration: 125,
    ageRating: '16+'
  },
  {
    theatreIndex: 2,
    title: 'Oedipus Rex',
    description: 'The ultimate fate drama with stunning revelations',
    duration: 105,
    ageRating: '14+'
  }
];

const removedShowTitles = ['A Midsummer Night\'s Dream'];
const managedShowTitles = [...shows.map((show) => show.title), ...removedShowTitles];
const managedTheatreNames = [...new Set(theatres.map((theatre) => theatre.name))];

const buildPlaceholders = (items) => items.map(() => '?').join(', ');

const run = async () => {
  let conn;

  try {
    conn = await pool.getConnection();

    const showTitlePlaceholders = buildPlaceholders(managedShowTitles);
    const theatreNamePlaceholders = buildPlaceholders(managedTheatreNames);

    // Reset the sample catalog so repeated seeding stays deterministic.
    await conn.query(
      `DELETE rs
       FROM reservation_seats rs
       INNER JOIN showtimes st ON st.showtime_id = rs.showtime_id
       INNER JOIN shows s ON s.show_id = st.show_id
       WHERE s.title IN (${showTitlePlaceholders})`,
      managedShowTitles
    );
    await conn.query(
      `DELETE r
       FROM reservations r
       INNER JOIN showtimes st ON st.showtime_id = r.showtime_id
       INNER JOIN shows s ON s.show_id = st.show_id
       WHERE s.title IN (${showTitlePlaceholders})`,
      managedShowTitles
    );
    await conn.query(
      `DELETE st
       FROM showtimes st
       INNER JOIN shows s ON s.show_id = st.show_id
       WHERE s.title IN (${showTitlePlaceholders})`,
      managedShowTitles
    );
    await conn.query(
      `DELETE FROM shows
       WHERE title IN (${showTitlePlaceholders})`,
      managedShowTitles
    );
    await conn.query(
      `DELETE FROM theatres
       WHERE name IN (${theatreNamePlaceholders})`,
      managedTheatreNames
    );

    console.log('Seeding theatres...');
    const theatreIdByKey = new Map();

    for (const theatre of theatres) {
      const result = await conn.query(
        `INSERT INTO theatres (name, location, description)
         VALUES (?, ?, ?)`,
        [theatre.name, theatre.location, theatre.description]
      );

      theatreIdByKey.set(`${theatre.name}|||${theatre.location}`, Number(result.insertId));
      console.log(`  Created theatre: ${theatre.name}`);
    }

    console.log('\nSeeding shows...');
    let createdShowsCount = 0;

    for (const show of shows) {
      const theatre = theatres[show.theatreIndex];
      const theatreKey = `${theatre.name}|||${theatre.location}`;
      const theatreId = theatreIdByKey.get(theatreKey);

      if (!theatreId) {
        throw new Error(`Missing theatre id for ${theatreKey}`);
      }

      await conn.query(
        `INSERT INTO shows (theatre_id, title, description, duration, age_rating)
         VALUES (?, ?, ?, ?, ?)`,
        [theatreId, show.title, show.description, show.duration, show.ageRating]
      );

      console.log(`  Created show: ${show.title}`);
      createdShowsCount += 1;
    }

    const theatreCount = await conn.query('SELECT COUNT(*) AS total FROM theatres');
    const showCount = await conn.query('SELECT COUNT(*) AS total FROM shows');

    console.log('\n========================================');
    console.log(`Managed shows inserted: ${createdShowsCount}`);
    console.log(`Total theatres: ${theatreCount[0]?.total}`);
    console.log(`Total shows: ${showCount[0]?.total}`);
    console.log('========================================');
    console.log('\nNow run: npm run seed:showtimes');
  } catch (error) {
    console.error('Failed to seed initial data:', error.message);
    process.exitCode = 1;
  } finally {
    if (conn) {
      conn.release();
    }
    await pool.end();
  }
};

run();
