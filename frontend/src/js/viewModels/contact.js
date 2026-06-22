define([
  'knockout',
  'ojs/ojcontext'
], function (ko, Context) {
  function ContactViewModel() {
    var self = this;

    self.form = {
      name: ko.observable(''),
      email: ko.observable(''),
      subject: ko.observable(''),
      message: ko.observable('')
    };

    self.isSubmitting = ko.observable(false);
    self.messageError = ko.observable('');
    self.messageSuccess = ko.observable('');

    self.submitContactForm = function () {
      self.messageError('');
      self.messageSuccess('');

      var name = (self.form.name() || '').trim();
      var email = (self.form.email() || '').trim();
      var subject = (self.form.subject() || '').trim();
      var message = (self.form.message() || '').trim();

      if (!name || !email || !subject || !message) {
        self.messageError('Please fill in all fields.');
        return false;
      }

      var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        self.messageError('Please enter a valid email address.');
        return false;
      }

      self.isSubmitting(true);

      setTimeout(function () {
        self.isSubmitting(false);
        self.messageSuccess('Your message has been sent successfully.');

        self.form.name('');
        self.form.email('');
        self.form.subject('');
        self.form.message('');
      }, 800);

      return false;
    };

    self.connected = function () {
      document.title = 'Contact | CarHub';
    };
  }

  return ContactViewModel;
});