pipeline {
  agent any

  environment {
    IMAGE = "googletrade:${env.BRANCH_NAME ?: 'local'}-${env.BUILD_NUMBER ?: '1'}"
    REGISTRY = "" // set if you push to registry, e.g. my-registry.example.com
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Install') {
      steps {
        sh 'npm ci'
      }
    }

    stage('Lint') {
      steps {
        sh 'npm run lint || true' // optional: keep pipeline from failing if no linter
      }
    }

    stage('Unit Tests') {
      steps {
        sh 'npm test'
      }
      post { always { junit allowEmptyResults: true, testResults: '**/junit-*.xml' } }
    }

    stage('Build Docker') {
      steps {
        sh 'docker build -t $IMAGE .'
      }
    }

    stage('Push Image') {
      when { expression { return env.REGISTRY && env.REGISTRY != "" } }
      steps {
        withCredentials([usernamePassword(credentialsId: 'registry-creds', usernameVariable: 'REG_USER', passwordVariable: 'REG_PASS')]) {
          sh """
            echo "$REG_PASS" | docker login -u "$REG_USER" --password-stdin $REGISTRY
            docker tag $IMAGE $REGISTRY/$IMAGE
            docker push $REGISTRY/$IMAGE
          """
        }
      }
    }

    stage('Deploy to Server') {
      steps {
        sshagent(['deploy-key']) {
          sh """
            ssh -o StrictHostKeyChecking=no deploy@${params.DEPLOY_HOST} \\
              'docker stop googletrade || true && docker rm googletrade || true'
            ssh -o StrictHostKeyChecking=no deploy@${params.DEPLOY_HOST} \\
              'docker run -d --restart always --name googletrade -p 3000:3000 $IMAGE'
          """
        }
      }
    }
  }

  post {
    success { echo "Pipeline succeeded: ${env.BUILD_URL}" }
    failure { echo "Pipeline failed: ${env.BUILD_URL}" }
  }
}
