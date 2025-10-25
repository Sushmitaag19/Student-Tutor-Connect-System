const models = require('../models');

async function syncDatabase() {
  try {
    console.log('Starting database synchronization...');
    
    // Sync all models
    await models.sequelize.sync({ force: false, alter: true });
    console.log('Database synchronized successfully');
    
    // Create default admin user if it doesn't exist
    const bcrypt = require('bcryptjs');
    const { User } = models;
    
    const adminExists = await User.findOne({ where: { email: 'admin@studenttutor.com' } });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        full_name: 'System Administrator',
        email: 'admin@studenttutor.com',
        password: hashedPassword,
        role: 'admin'
      });
      console.log('Default admin user created');
    }
    
    // Create some default subjects
    const { Subject } = models;
    const defaultSubjects = [
      { name: 'Mathematics', description: 'Algebra, Calculus, Geometry, Statistics', category: 'STEM' },
      { name: 'Physics', description: 'Mechanics, Thermodynamics, Electromagnetism', category: 'STEM' },
      { name: 'Chemistry', description: 'Organic, Inorganic, Physical Chemistry', category: 'STEM' },
      { name: 'Biology', description: 'Cell Biology, Genetics, Ecology', category: 'STEM' },
      { name: 'English Literature', description: 'Poetry, Prose, Drama Analysis', category: 'Language Arts' },
      { name: 'History', description: 'World History, American History, European History', category: 'Social Sciences' },
      { name: 'Computer Science', description: 'Programming, Algorithms, Data Structures', category: 'STEM' },
      { name: 'Economics', description: 'Microeconomics, Macroeconomics, Finance', category: 'Social Sciences' }
    ];
    
    for (const subject of defaultSubjects) {
      await Subject.findOrCreate({
        where: { name: subject.name },
        defaults: subject
      });
    }
    console.log('Default subjects created');
    
    console.log('Database setup completed successfully');
  } catch (error) {
    console.error('Error synchronizing database:', error);
  } finally {
    await models.sequelize.close();
  }
}

// Run the synchronization
syncDatabase().catch(console.error);
