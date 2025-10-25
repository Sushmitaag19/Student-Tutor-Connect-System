const { Sequelize } = require('sequelize');
const sequelize = require('../config/database');

// Import all models
const User = require('./User');
const Student = require('./Student');
const Tutor = require('./Tutor');
const Subject = require('./Subject');
const TutorSubject = require('./TutorSubject');
const Session = require('./Session');
const Rating = require('./Rating');
const Question = require('./Question');
const Answer = require('./Answer');
const Vote = require('./Vote');
const Notification = require('./Notification');
const TutorVerification = require('./TutorVerification');

// Initialize models
const models = {
  User: User(sequelize, Sequelize.DataTypes),
  Student: Student(sequelize, Sequelize.DataTypes),
  Tutor: Tutor(sequelize, Sequelize.DataTypes),
  Subject: Subject(sequelize, Sequelize.DataTypes),
  TutorSubject: TutorSubject(sequelize, Sequelize.DataTypes),
  Session: Session(sequelize, Sequelize.DataTypes),
  Rating: Rating(sequelize, Sequelize.DataTypes),
  Question: Question(sequelize, Sequelize.DataTypes),
  Answer: Answer(sequelize, Sequelize.DataTypes),
  Vote: Vote(sequelize, Sequelize.DataTypes),
  Notification: Notification(sequelize, Sequelize.DataTypes),
  TutorVerification: TutorVerification(sequelize, Sequelize.DataTypes)
};

// Define associations
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

models.sequelize = sequelize;
models.Sequelize = Sequelize;

module.exports = models;
