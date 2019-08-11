FROM golang:1.12.7-stretch

EXPOSE 9876

RUN touch ~/.bashrc

# Install dep.
RUN curl https://raw.githubusercontent.com/golang/dep/master/install.sh | sh

# Install nvm.
RUN curl https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh | bash
ENV NVM_DIR /root/.nvm
ENV PATH $NVM_DIR/bin:$PATH
RUN /bin/bash -c "source $NVM_DIR/nvm.sh && nvm install 10.9.0"

CMD /bin/bash
