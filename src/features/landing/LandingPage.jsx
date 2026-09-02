import logo from '../../assets/educore_logo.png';
import { Icon } from '../../components/Icon.jsx';
import './landing.css';

const roles = [
  {
    icon: 'admin_panel_settings',
    name: 'Administrators',
    title: 'See the whole school clearly',
    text: 'Manage students, classes, staff, fees, attendance statistics, and teacher-submitted results from one workspace.',
    items: [
      'School-wide dashboard',
      'Results review and approval',
      'Finance and staff oversight',
    ],
  },
  {
    icon: 'co_present',
    name: 'Form teachers',
    title: 'Focus on the class you lead',
    text: 'Record attendance and subject scores for your assigned class, then prepare report cards after approval.',
    items: [
      'One-tap attendance',
      'Class-based score entry',
      'Printable report cards',
    ],
  },
  {
    icon: 'family_restroom',
    name: 'School community',
    title: 'Records you can trust',
    text: 'Keep each learner’s academic, attendance, and financial history organized throughout the school year.',
    items: [
      'Student profiles',
      'Clear payment history',
      'Consistent academic records',
    ],
  },
];

const benefits = [
  [
    'school',
    'Built for basic schools',
    'A focused KG to JHS structure without university or college complexity.',
  ],
  [
    'verified',
    'Controlled results workflow',
    'Teachers submit scores; administrators review and approve before report cards are prepared.',
  ],
  [
    'calendar_month',
    'Ghanaian school calendar',
    'Academic years, terms, classes, and subjects organized around familiar school operations.',
  ],
  [
    'shield_lock',
    'Private by design',
    'Every school has an isolated workspace with role-based permissions and auditable actions.',
  ],
  [
    'payments',
    'Clear fee visibility',
    'Track bills, payments, balances, adjustments, and student ledgers in one place.',
  ],
  [
    'monitoring',
    'Useful school statistics',
    'See class attendance and operational trends without taking over the teacher’s work.',
  ],
];

const testimonials = [
  {
    quote:
      'Fee collection and follow-up are easier because payment records and balances are visible in one place.',
    initials: 'AM',
    name: 'Abena Mensah',
    role: 'Proprietress',
    location: 'Accra',
  },
  {
    quote:
      'Attendance, scores, and report cards now follow one clear class workflow instead of separate registers.',
    initials: 'KA',
    name: 'Kwame Asante',
    role: 'JHS Class Teacher',
    location: 'Kumasi',
  },
  {
    quote:
      'The school feels more organized because administrators can see progress without taking over the teacher’s work.',
    initials: 'ED',
    name: 'Emmanuel Darko',
    role: 'Head Teacher',
    location: 'Cape Coast',
  },
];

function DashboardPreview() {
  return (
    <div className="dashboard-preview">
      <div className="preview-top">
        <span>
          <img src={logo} alt="" />
          <b>EduCore</b>
        </span>
        <i />
        <i />
      </div>
      <div className="preview-body">
        <aside>
          {['grid_view', 'groups', 'school', 'how_to_reg', 'payments'].map(
            (icon, index) => (
              <Icon key={icon} className={index === 0 ? 'active' : ''}>
                {icon}
              </Icon>
            ),
          )}
        </aside>
        <section>
          <small>GOOD MORNING</small>
          <h3>Your school at a glance</h3>
          <div className="preview-stats">
            <span>
              <Icon>groups</Icon>
              <b>428</b>
              <small>Students</small>
            </span>
            <span>
              <Icon>how_to_reg</Icon>
              <b>94%</b>
              <small>Attendance</small>
            </span>
            <span>
              <Icon>payments</Icon>
              <b>81%</b>
              <small>Fees collected</small>
            </span>
          </div>
          <div className="preview-chart">
            <header>
              <b>Attendance overview</b>
              <small>This week</small>
            </header>
            <div>
              {[48, 66, 58, 82, 74].map((height, index) => (
                <i key={index} style={{ height: `${height}%` }} />
              ))}
            </div>
          </div>
          <div className="preview-activity">
            <b>Recent activity</b>
            <p>
              <Icon>check_circle</Icon>
              <span>
                JHS 2 attendance completed
                <small>3 students present today</small>
              </span>
            </p>
            <p>
              <Icon>verified</Icon>
              <span>
                Results ready for review
                <small>Teacher submission received</small>
              </span>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <main className="marketing-page">
      <nav className="marketing-nav">
        <a className="marketing-brand" href="#/">
          <img src={logo} alt="" />
          <span>
            <strong>EduCore</strong>
            <small>School management for Ghana</small>
          </span>
        </a>
        <div className="marketing-links">
          <a href="#features">Features</a>
          <a href="#roles">Who it’s for</a>
          <a href="#why">Why EduCore</a>
        </div>
        <a className="marketing-signin" href="#/login">
          School sign in <Icon>arrow_forward</Icon>
        </a>
      </nav>

      <section className="marketing-hero">
        <div className="hero-copy">
          <span className="hero-pill">
            <Icon>location_on</Icon>Built for Ghanaian basic schools
          </span>
          <h1>
            Run your school with <em>less paperwork</em> and more clarity.
          </h1>
          <p>
            Students, fees, attendance, scores, and report cards—one secure
            platform designed for how kindergarten, primary, and JHS schools
            actually work.
          </p>
          <div className="hero-actions">
            <a className="marketing-primary" href="#/login">
              Open your school portal <Icon>arrow_forward</Icon>
            </a>
            <a className="marketing-secondary" href="#features">
              Explore features <Icon>south</Icon>
            </a>
          </div>
          <div className="hero-trust">
            <span>
              <Icon>check_circle</Icon>Simple setup
            </span>
            <span>
              <Icon>check_circle</Icon>Role-based access
            </span>
            <span>
              <Icon>check_circle</Icon>KG–JHS ready
            </span>
          </div>
        </div>
        <DashboardPreview />
      </section>

      <section className="marketing-section change-section">
        <header>
          <span className="section-kicker">A better school day</span>
          <h2>Replace scattered records with one reliable workflow.</h2>
          <p>
            Give every task a clear owner while administrators retain the
            visibility they need.
          </p>
        </header>
        <div className="change-grid">
          <article className="before-card">
            <span>Before EduCore</span>
            {[
              ['close', 'Attendance registers are hard to summarize'],
              ['close', 'Score sheets move through chats and paper'],
              ['close', 'Fee balances live in separate spreadsheets'],
              ['close', 'Report card preparation takes too long'],
            ].map(([icon, text]) => (
              <p key={text}>
                <Icon>{icon}</Icon>
                {text}
              </p>
            ))}
          </article>
          <article className="after-card">
            <span>With EduCore</span>
            {[
              ['check', 'Teachers record attendance for their class'],
              ['check', 'Submitted scores follow an approval workflow'],
              ['check', 'Every student has a clear financial ledger'],
              ['check', 'Approved results become printable report cards'],
            ].map(([icon, text]) => (
              <p key={text}>
                <Icon>{icon}</Icon>
                {text}
              </p>
            ))}
          </article>
        </div>
      </section>

      <section className="marketing-section role-section" id="roles">
        <header>
          <span className="section-kicker">The right screen for each role</span>
          <h2>School administration without admin clutter.</h2>
          <p>
            Permissions keep people focused on the work they are responsible
            for.
          </p>
        </header>
        <div className="role-grid">
          {roles.map((role) => (
            <article key={role.name}>
              <span className="role-mark">
                <Icon>{role.icon}</Icon>
              </span>
              <small>{role.name}</small>
              <h3>{role.title}</h3>
              <p>{role.text}</p>
              <ul>
                {role.items.map((item) => (
                  <li key={item}>
                    <Icon>check</Icon>
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="feature-band" id="features">
        <div>
          <span className="section-kicker">Connected school operations</span>
          <h2>From morning attendance to end-of-term reports.</h2>
          <p>
            EduCore connects the records your school already manages, so
            information entered once becomes useful everywhere.
          </p>
          <a href="#/login">
            Sign in to EduCore <Icon>arrow_forward</Icon>
          </a>
        </div>
        <div className="workflow-demo">
          <span>
            <Icon>how_to_reg</Icon>
            <b>Attendance recorded</b>
            <small>Form teacher · JHS 2</small>
          </span>
          <i />
          <span>
            <Icon>edit_note</Icon>
            <b>Scores submitted</b>
            <small>All class subjects</small>
          </span>
          <i />
          <span>
            <Icon>verified</Icon>
            <b>Results approved</b>
            <small>Ready for report cards</small>
          </span>
        </div>
      </section>

      <section className="marketing-section" id="why">
        <header>
          <span className="section-kicker">Made to fit your school</span>
          <h2>Practical tools. Familiar workflows.</h2>
        </header>
        <div className="benefit-grid">
          {benefits.map(([icon, title, text]) => (
            <article key={title}>
              <Icon>{icon}</Icon>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-section testimonial-section">
        <header>
          <span className="section-kicker">What school teams say</span>
          <h2>Built for the people who run the school every day.</h2>
          <p>
            Administrators and teachers get clearer records, simpler handoffs,
            and more time for students.
          </p>
        </header>
        <div className="testimonial-grid">
          {testimonials.map((item) => (
            <blockquote key={item.name}>
              <Icon>format_quote</Icon>
              <p>“{item.quote}”</p>
              <footer>
                <span>{item.initials}</span>
                <div>
                  <strong>{item.name}</strong>
                  <small>
                    {item.role} · {item.location}
                  </small>
                </div>
              </footer>
            </blockquote>
          ))}
        </div>
      </section>

      <section className="marketing-cta">
        <div>
          <span>Ready for a clearer school day?</span>
          <h2>
            Bring your students, academics, and operations into one place.
          </h2>
          <p>Access your school workspace and continue setting up EduCore.</p>
        </div>
        <a href="#/login">
          Go to school sign in <Icon>arrow_forward</Icon>
        </a>
      </section>

      <footer className="marketing-footer">
        <a className="marketing-brand" href="#/">
          <img src={logo} alt="" />
          <span>
            <strong>EduCore</strong>
            <small>School management for Ghana</small>
          </span>
        </a>
        <p>Secure school operations from kindergarten through JHS.</p>
        <a href="#/login">School sign in</a>
        <span>© {new Date().getFullYear()} EduCore</span>
      </footer>
    </main>
  );
}
